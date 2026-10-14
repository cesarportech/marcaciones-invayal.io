begin;
create function invayal_private.invayal_session_valid() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.sessions s where s.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt()->>'session_id')
  );
$$;
revoke all on function invayal_private.invayal_session_valid() from public, anon;
grant execute on function invayal_private.invayal_session_valid() to authenticated;
create function public.invayal_session_valid() returns boolean
language sql stable security invoker set search_path = '' as $$
  select invayal_private.invayal_session_valid();
$$;
revoke all on function public.invayal_session_valid() from public, anon;
grant execute on function public.invayal_session_valid() to authenticated;

create or replace function invayal_private.invayal_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select invayal_private.invayal_session_valid() and exists(select 1 from public.invayal_employees
    where user_id = (select auth.uid()) and active and role = 'admin' and not must_change_password);
$$;

create policy invayal_session_employees on public.invayal_employees as restrictive for select to authenticated
using ((select invayal_private.invayal_session_valid()));
create policy invayal_session_attendance on public.invayal_attendance as restrictive for select to authenticated
using ((select invayal_private.invayal_session_valid()));
create policy invayal_session_departments on public.invayal_departments as restrictive for select to authenticated
using ((select invayal_private.invayal_session_valid()));
create policy invayal_session_policy on public.invayal_attendance_policy as restrictive for select to authenticated
using ((select invayal_private.invayal_session_valid()));

create or replace function public.invayal_clock(kind text) returns public.invayal_attendance
language plpgsql security invoker set search_path = '' as $$
begin
  if not invayal_private.invayal_session_valid() then raise exception 'Sesión caducada. Vuelve a ingresar.'; end if;
  return invayal_private.invayal_clock(kind);
end;
$$;

-- Solo el servicio administrativo puede invalidar sesiones.
create function invayal_private.invayal_revoke_sessions(target_user uuid) returns void
language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = target_user;
$$;
revoke all on function invayal_private.invayal_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function invayal_private.invayal_revoke_sessions(uuid) to service_role;
create function public.invayal_revoke_sessions(target_user uuid) returns void
language sql security invoker set search_path = '' as $$
  select invayal_private.invayal_revoke_sessions(target_user);
$$;
revoke all on function public.invayal_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.invayal_revoke_sessions(uuid) to service_role;
commit;
