-- =====================================================================
-- 0010_progress_to_hundred.sql
--
-- Progress used to stop at 99%. The reasoning was sound — finishing is
-- the manager's call, not the assignee's — but the interface made it
-- absurd: a person who had finished their work dragged the slider as far
-- as it would go and watched it refuse the last percent. Nothing ever
-- looked done.
--
-- The rule was right; the place it was enforced was wrong. Reaching 100%
-- is not a claim that the work is approved. It is a claim that the work
-- is *finished* — which is exactly what submitting for review means. So
-- 100% now carries the task into review, in one gesture, and the manager
-- still decides what happens next.
--
--   0–99 %  → In progress. The assignee's own account of where they are.
--   100 %   → Under review. Finished, and waiting on the manager.
--   Approve → Approved. Only now does it count towards the project.
--   Reject  → Rejected, with a reason. Back to the assignee.
--
-- Nothing about who may approve has changed. The administrator reads
-- every project and approves none of them.
-- =====================================================================

-- The old signature returned void. Callers now want to know where the
-- task ended up, so that the interface can say "sent for review" rather
-- than "saved" — and a return type cannot be changed in place.
drop function if exists update_task_progress(uuid, int, task_status, text, text);

create or replace function update_task_progress(
  p_task_id  uuid,
  p_progress int,
  p_status   task_status default null,
  p_what     text default null,
  p_why      text default null
) returns task_status
language plpgsql set search_path = public as $$
declare
  v_before int;
  v_pid    uuid;
  v_name   text;
  v_count  int;
  v_final  task_status;
begin
  -- Out-of-range input used to be silently clamped, so asking for 250%
  -- quietly became 99% and the person was never told. Say so instead.
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
    raise exception 'Task not found or access denied';
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
    -- Anything below 100 is work in progress. Moving off zero starts the
    -- clock; sending a rejected task back down reopens it.
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

  -- Every movement is recorded, including the one that submits the task.
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
