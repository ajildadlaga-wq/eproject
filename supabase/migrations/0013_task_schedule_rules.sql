-- =====================================================================
-- 0013_task_schedule_rules.sql
--
-- A Gantt chart is only worth reading if the bars mean something. Until
-- now any date could be typed into any task: work that finished before
-- it started, work scheduled a year after its project closed, work that
-- began on Monday but waited for something delivered on Friday. The
-- chart drew all of it faithfully, which is the problem — a picture of
-- an impossible plan looks exactly like a picture of a real one.
--
-- The rules below are the ones a scheduler would apply by hand:
--
--   1. A task ends no earlier than it starts.
--   2. A task lives inside its project's dates.
--   3. A task that waits for another starts after that one finishes.
--   4. A task does not wait for itself, directly or round a loop.
--   5. A task only waits for tasks in the same project.
--   6. Moving a task later cannot silently break the tasks behind it.
--   7. Narrowing a project's dates cannot silently strand its tasks.
--
-- They live here rather than in the form because a form is a courtesy
-- and this is a constraint. The REST API is open to anyone with a token.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Does adding these dependencies put the task on a loop?
--
-- Walks the graph from the proposed prerequisites and reports whether it
-- can get back to the task itself. Without this, two tasks can each be
-- made to wait for the other and neither can ever start — a deadlock
-- drawn as a chart.

create or replace function task_would_cycle(p_task_id uuid, p_deps uuid[])
returns boolean
language sql stable set search_path = public as $$
  with recursive reaches(id) as (
    select unnest(p_deps)
    union
    select unnest(t.depends_on)
      from tasks t
      join reaches r on r.id = t.id
     where t.depends_on is not null
  )
  select exists (select 1 from reaches where id = p_task_id);
$$;

-- ---------------------------------------------------------------------
-- The rules, applied to one task.

create or replace function check_task_schedule()
returns trigger language plpgsql set search_path = public as $$
declare
  v_project_start date;
  v_project_end   date;
  v_dep_end       date;
  v_dep_name      text;
  v_blocker       record;
begin
  select start_date, end_date
    into v_project_start, v_project_end
    from projects where id = new.project_id;

  -- 1. A task ends no earlier than it starts.
  if new.planned_start is not null and new.planned_end is not null
     and new.planned_end < new.planned_start then
    raise exception 'This task would end on % but start on %.',
      new.planned_end, new.planned_start using errcode = '22023';
  end if;

  -- 2. Inside the project's dates. A task outside them is either a
  --    mistake or a sign the project's own dates are wrong; either way
  --    somebody should look rather than let the chart lie.
  if v_project_start is not null and new.planned_start is not null
     and new.planned_start < v_project_start then
    raise exception 'The project starts on %. A task cannot begin before that.',
      v_project_start using errcode = '22023';
  end if;

  if v_project_end is not null and new.planned_end is not null
     and new.planned_end > v_project_end then
    raise exception 'The project ends on %. A task cannot run past that.',
      v_project_end using errcode = '22023';
  end if;

  if v_project_end is not null and new.planned_start is not null
     and new.planned_start > v_project_end then
    raise exception 'The project ends on %. A task cannot begin after it is over.',
      v_project_end using errcode = '22023';
  end if;

  -- 3-5. Dependencies.
  if new.depends_on is not null and array_length(new.depends_on, 1) > 0 then

    if new.id = any (new.depends_on) then
      raise exception 'A task cannot wait for itself.' using errcode = '22023';
    end if;

    if exists (select 1 from tasks
                where id = any (new.depends_on)
                  and project_id is distinct from new.project_id) then
      raise exception 'A task can only wait for tasks in the same project.'
        using errcode = '22023';
    end if;

    if task_would_cycle(new.id, new.depends_on) then
      raise exception 'These tasks would end up waiting for each other, so none of them could start.'
        using errcode = '22023';
    end if;

    -- The latest thing it waits for decides the earliest it can begin.
    select t.planned_end, t.name
      into v_dep_end, v_dep_name
      from tasks t
     where t.id = any (new.depends_on)
       and t.planned_end is not null
     order by t.planned_end desc
     limit 1;

    if v_dep_end is not null and new.planned_start is not null
       and new.planned_start <= v_dep_end then
      raise exception 'This task waits for "%", which finishes on %. It cannot begin until %.',
        v_dep_name, v_dep_end, v_dep_end + 1 using errcode = '22023';
    end if;
  end if;

  -- 6. Moving this task later must not strand the tasks that wait for it.
  --    Reported by name, because "there is a conflict somewhere" is not
  --    something anybody can act on.
  if tg_op = 'UPDATE' and new.planned_end is distinct from old.planned_end then
    select t.name, t.planned_start into v_blocker
      from tasks t
     where new.id = any (t.depends_on)
       and t.planned_start is not null
       and new.planned_end is not null
       and t.planned_start <= new.planned_end
     limit 1;

    if v_blocker.name is not null then
      raise exception '"%" waits for this task and is due to start on %. Move that one first.',
        v_blocker.name, v_blocker.planned_start using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_task_schedule on tasks;
create trigger trg_task_schedule
  before insert or update on tasks
  for each row execute function check_task_schedule();

-- ---------------------------------------------------------------------
-- 7. A project's dates cannot be narrowed out from under its tasks.
--
-- Widening is always allowed. Narrowing is refused, and the refusal
-- names the task that would be left outside — that task is the decision
-- to make, not this one.

create or replace function check_project_window()
returns trigger language plpgsql set search_path = public as $$
declare v_task record;
begin
  if new.start_date is not null
     and new.start_date is distinct from old.start_date then
    select name, planned_start into v_task
      from tasks
     where project_id = new.id
       and planned_start is not null
       and planned_start < new.start_date
     order by planned_start
     limit 1;

    if v_task.name is not null then
      raise exception '"%" begins on %, before the new project start of %.',
        v_task.name, v_task.planned_start, new.start_date using errcode = '22023';
    end if;
  end if;

  if new.end_date is not null
     and new.end_date is distinct from old.end_date then
    select name, planned_end into v_task
      from tasks
     where project_id = new.id
       and planned_end is not null
       and planned_end > new.end_date
     order by planned_end desc
     limit 1;

    if v_task.name is not null then
      raise exception '"%" runs to %, past the new project end of %.',
        v_task.name, v_task.planned_end, new.end_date using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_window on projects;
create trigger trg_project_window
  before update on projects
  for each row execute function check_project_window();
