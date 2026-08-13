-- =====================================================================
-- 0012_confirmed_signups_only.sql
--
-- Signing up created a user of the system immediately. The profile row
-- appeared the moment the form was submitted, before anybody had shown
-- that the address was theirs. Anyone could type a stranger's email and
-- that stranger would appear in the user list, as a viewer, having done
-- nothing.
--
-- The confirmation mail existed; it just did not gate anything.
--
-- From here, proving the address is what makes someone a user:
--
--   Sign up            → an account waits. No profile. Not a user yet.
--   Confirm the link   → the profile appears, as VIEWER.
--   Never confirm      → nothing was ever created, and the account can
--                        be swept away.
--
-- An administrator raises them from VIEWER afterwards if they should be
-- more. Least privilege on arrival: the safest thing to hand a new
-- account is the ability to look and nothing else.
-- =====================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  -- An unproven address is not a user. Say nothing and wait.
  if new.email_confirmed_at is null then
    return new;
  end if;

  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'VIEWER')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Two moments can make a user, and both run the same function.
--
-- An account created by an administrator arrives already confirmed, so
-- the insert is the moment. A self-signup arrives unconfirmed and is
-- confirmed later, so for that person the moment is an update — which
-- the original trigger never watched. That is why the gate had to be
-- opened at insert time to work at all.

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Sweeping up abandoned signups.
--
-- Somebody starts to register, never opens the mail, and an unusable
-- account sits in auth.users holding their address hostage: they cannot
-- sign up again with it. This releases those addresses.
--
-- It is deliberately not automatic and not aggressive. Call it when you
-- want to, with a window you choose:
--
--   select cleanup_unconfirmed_signups();                  -- older than a day
--   select cleanup_unconfirmed_signups(interval '1 hour'); -- shorter
--
-- Confirmed accounts are never touched, whatever the window.

create or replace function cleanup_unconfirmed_signups(
  p_older_than interval default interval '24 hours'
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if not is_admin() then
    raise exception 'Only an administrator can clear abandoned signups';
  end if;

  with gone as (
    delete from auth.users
     where email_confirmed_at is null
       and created_at < now() - p_older_than
    returning 1
  )
  select count(*) into v_count from gone;

  return v_count;
end;
$$;

revoke all on function cleanup_unconfirmed_signups(interval) from public;
grant execute on function cleanup_unconfirmed_signups(interval) to authenticated;

-- ---------------------------------------------------------------------
-- Profiles that exist for accounts which were never confirmed.
--
-- These are the ones the old trigger let through. Reviewing them is a
-- judgement call — one of them may be an account someone is using —
-- so this reports rather than deletes. Feed the result to
-- cleanup_unconfirmed_signups() once you have looked.

create or replace function unconfirmed_profiles()
returns table (id uuid, full_name text, role text, email text, signed_up_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role::text, u.email::text, u.created_at
    from profiles p
    join auth.users u on u.id = p.id
   where u.email_confirmed_at is null
   order by u.created_at desc;
$$;

revoke all on function unconfirmed_profiles() from public;
grant execute on function unconfirmed_profiles() to authenticated;
