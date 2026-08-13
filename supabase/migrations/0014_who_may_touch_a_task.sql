-- =====================================================================
-- 0014_who_may_touch_a_task.sql
--
-- Two different acts had been treated as one.
--
-- Deciding that a piece of work exists — what it is called, when it runs,
-- what it waits for, who does it — is planning, and it belongs to the
-- project manager. Saying how far along that work is belongs to the
-- person doing it, and to nobody else.
--
-- Until now both went through the same permission: anyone with write
-- access to the project could add tasks, rename them, move their dates,
-- and report progress on work assigned to someone else. A team member
-- could invent a task, mark it finished and send it for approval, and
-- the audit log would record all of it as legitimate.
--
--   Project manager   creates, edits, deletes, assigns, approves
--   Assignee          reports progress on their own task, and only theirs
--   Everyone else     reads
--
-- The manager keeps progress rights on unassigned tasks, because work
-- nobody has been given is still theirs to account for.
-- =====================================================================

-- ---------------------------------------------------------- planning
-- Shaping the work is the manager's, in full.

drop policy if exists tasks_insert on tasks;
create policy tasks_insert on tasks
  for insert to authenticated
  with check (is_project_manager(project_id));

drop policy if exists tasks_update on tasks;
create policy tasks_update on tasks
  for update to authenticated
  using (is_project_manager(project_id))
  with check (is_project_manager(project_id));

drop policy if exists tasks_delete on tasks;
create policy tasks_delete on tasks
  for delete to authenticated
  using (is_project_manager(project_id));

-- ---------------------------------------------------------- reporting
-- The assignee has no rights on the row itself — deliberately, so that
-- they cannot quietly move a deadline while reporting against it. They
-- report through this function, which writes on their behalf after
-- checking that the task is in fact theirs.

create or replace function may_report_on_task(p_task_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tasks t
     where t.id = p_task_id
       and (
         t.assignee_id = auth.uid()
         or (t.assignee_id is null and is_project_manager(t.project_id))
       )
  );
$$;

drop function if exists update_task_progress(uuid, int, task_status, text, text);

create or replace function update_task_progress(
  p_task_id  uuid,
  p_progress int,
  p_status   task_status default null,
  p_what     text default null,
  p_why      text default null
) returns task_status
language plpgsql security definer set search_path = public as $$
declare
  v_before int;
  v_pid    uuid;
  v_name   text;
  v_count  int;
  v_final  task_status;
begin
  if p_progress is null then
    raise exception 'Progress must be a whole number between 0 and 100'
      using errcode = '22023';
  end if;

  if p_progress < 0 or p_progress > 100 then
    raise exception 'Progress must be between 0 and 100. Received %.', p_progress
      using errcode = '22023';
  end if;

  select percent_complete, project_id into v_before, v_pid
    from tasks where id = p_task_id;
  if v_pid is null then
    raise exception 'Task not found';
  end if;

  if not has_project_access(v_pid) then
    raise exception 'Task not found';
  end if;

  if not may_report_on_task(p_task_id) then
    raise exception 'Only the person this task is assigned to can report on it';
  end if;

  if p_progress = 100 then
    -- Finished, by the assignee's own account. That is a submission.
    update tasks
       set percent_complete = 100,
           status           = 'UNDER_REVIEW',
           submitted_at     = now(),
           actual_start     = coalesce(actual_start, current_date),
           actual_end       = coalesce(actual_end, current_date)
     where id = p_task_id
       and status not in ('UNDER_REVIEW', 'APPROVED');
  else
    update tasks
       set percent_complete = p_progress,
           status = coalesce(
             p_status,
             case when status in ('DRAFT', 'ASSIGNED', 'REJECTED')
                  then 'IN_PROGRESS'::task_status
                  else status end),
           actual_start = coalesce(actual_start, current_date),
           actual_end   = null
     where id = p_task_id
       and status not in ('UNDER_REVIEW', 'APPROVED');
  end if;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This task is under review or already approved, so it cannot be edited';
  end if;

  select status into v_final from tasks where id = p_task_id;

  select full_name into v_name from profiles where id = auth.uid();
  insert into task_updates (task_id, project_id, user_id, user_name,
                            progress_before, progress_after,
                            what_happened, why_changed)
  values (p_task_id, v_pid, auth.uid(), v_name, v_before, p_progress, p_what, p_why);

  if p_progress = 100 then
    perform write_audit(
      'TASK_SUBMITTED', 'task', p_task_id, v_pid,
      'Reached 100% and went for review',
      jsonb_build_object('note', p_what)
    );
  end if;

  return v_final;
end;
$$;

grant execute on function update_task_progress(uuid, int, task_status, text, text)
  to authenticated;

-- Submitting is the same claim made explicitly, so it needs the same
-- standing to write the row.
create or replace function submit_task(p_task_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_pid uuid; v_status task_status;
begin
  select project_id, status into v_pid, v_status from tasks where id = p_task_id;
  if v_pid is null or not has_project_access(v_pid) then
    raise exception 'Task not found';
  end if;

  if not may_report_on_task(p_task_id) then
    raise exception 'Only the person this task is assigned to can send it for review';
  end if;

  if v_status not in ('IN_PROGRESS', 'BLOCKED', 'REJECTED') then
    raise exception 'A task can only be submitted from In progress, Blocked or Rejected';
  end if;

  update tasks
     set status = 'UNDER_REVIEW', submitted_at = now(), percent_complete = 100,
         actual_end = coalesce(actual_end, current_date)
   where id = p_task_id;

  perform write_audit('TASK_SUBMITTED', 'task', p_task_id, v_pid,
                      'Task submitted for review', jsonb_build_object('note', p_note));
end;
$$;

-- Approving and rejecting write to the row too, and the manager's own
-- policy no longer covers every case they need, so they run definer as
-- well. Each still checks is_project_manager first — that check is the
-- rule, not the policy.
create or replace function approve_task(p_task_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_pid uuid; v_status task_status;
begin
  select project_id, status into v_pid, v_status from tasks where id = p_task_id;
  if v_pid is null then raise exception 'Task not found'; end if;

  if not is_project_manager(v_pid) then
    raise exception 'Only the project manager can approve work';
  end if;
  if v_status <> 'UNDER_REVIEW' then
    raise exception 'Only a task under review can be approved';
  end if;

  update tasks
     set status = 'APPROVED', percent_complete = 100,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note,
         actual_end = coalesce(actual_end, current_date)
   where id = p_task_id;

  perform write_audit('TASK_APPROVED', 'task', p_task_id, v_pid,
                      'Task approved', jsonb_build_object('note', p_note));
end;
$$;

create or replace function reject_task(p_task_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_pid uuid; v_status task_status;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required when sending work back';
  end if;

  select project_id, status into v_pid, v_status from tasks where id = p_task_id;
  if v_pid is null then raise exception 'Task not found'; end if;

  if not is_project_manager(v_pid) then
    raise exception 'Only the project manager can send work back';
  end if;
  if v_status <> 'UNDER_REVIEW' then
    raise exception 'Only a task under review can be sent back';
  end if;

  update tasks
     set status = 'REJECTED', reviewed_by = auth.uid(), reviewed_at = now(),
         review_note = p_reason, actual_end = null
   where id = p_task_id;

  perform write_audit('TASK_REJECTED', 'task', p_task_id, v_pid,
                      'Task sent back for rework', jsonb_build_object('reason', p_reason));
end;
$$;

grant execute on function may_report_on_task(uuid) to authenticated;
grant execute on function submit_task(uuid, text)  to authenticated;
grant execute on function approve_task(uuid, text) to authenticated;
grant execute on function reject_task(uuid, text)  to authenticated;
