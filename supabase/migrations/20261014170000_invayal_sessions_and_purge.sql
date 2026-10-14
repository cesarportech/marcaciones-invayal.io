begin;
-- 1) Las contraseñas solo las asigna el administrador: se elimina el cambio obligatorio de contraseña.
create or replace function invayal_private.invayal_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select invayal_private.invayal_session_valid() and exists(select 1 from public.invayal_employees
    where user_id = (select auth.uid()) and active and role = 'admin');
$$;

create or replace function invayal_private.invayal_clock(kind text) returns public.invayal_attendance
language plpgsql security definer set search_path = '' as $$
declare
  employee public.invayal_employees;
  policy public.invayal_attendance_policy;
  result public.invayal_attendance;
  instant timestamptz;
  local_date date;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if kind is null or kind not in ('in', 'out') then raise exception 'Marcación inválida.'; end if;
  -- El bloqueo por empleado serializa solicitudes simultáneas.
  select * into employee from public.invayal_employees where user_id = auth.uid() for update;
  if employee.id is null or not employee.active then raise exception 'Cuenta no habilitada.'; end if;
  select * into strict policy from public.invayal_attendance_policy where id;
  instant := clock_timestamp();
  local_date := (instant at time zone policy.timezone)::date;
  if not (extract(dow from local_date)::integer = any(policy.workdays)) then
    raise exception 'Día de descanso.';
  end if;
  if kind = 'in' then
    if exists(select 1 from public.invayal_attendance where employee_id = employee.id and work_date = local_date) then
      raise exception 'Ya registraste la entrada de hoy.';
    end if;
    insert into public.invayal_attendance(employee_id, work_date, clock_in, scheduled_start, tolerance_minutes, timezone)
    values (employee.id, local_date, instant, policy.start_time, policy.tolerance_minutes, policy.timezone)
    returning * into result;
  else
    update public.invayal_attendance set clock_out = instant
    where employee_id = employee.id and work_date = local_date and clock_out is null returning * into result;
    if result.id is null then raise exception 'No hay entrada abierta para hoy.'; end if;
  end if;
  return result;
end;
$$;

alter table public.invayal_employees drop column must_change_password;

-- 2) Gestión de sesiones: el administrador ve las sesiones activas de cada usuario.
create function invayal_private.invayal_active_sessions()
returns table(user_id uuid, sessions integer, last_seen timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not invayal_private.invayal_is_admin() then raise exception 'Se requiere acceso de RR. HH.'; end if;
  return query
    select s.user_id, count(*)::integer, max(coalesce(s.updated_at, s.created_at))
    from auth.sessions s
    join public.invayal_employees e on e.user_id = s.user_id
    where s.not_after is null or s.not_after > now()
    group by s.user_id;
end;
$$;
revoke all on function invayal_private.invayal_active_sessions() from public, anon;
grant execute on function invayal_private.invayal_active_sessions() to authenticated;
create function public.invayal_active_sessions()
returns table(user_id uuid, sessions integer, last_seen timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from invayal_private.invayal_active_sessions();
$$;
revoke all on function public.invayal_active_sessions() from public, anon;
grant execute on function public.invayal_active_sessions() to authenticated;

-- 3) Borrado total del historial de asistencia (irreversible). Deja una sola entrada de auditoría.
create function invayal_private.invayal_purge_history(confirmation text) returns integer
language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  if not invayal_private.invayal_is_admin() then raise exception 'Se requiere acceso de RR. HH.'; end if;
  if confirmation is distinct from 'BORRAR TODO' then raise exception 'Escribe BORRAR TODO para confirmar.'; end if;
  delete from public.invayal_attendance where id is not null;
  get diagnostics removed = row_count;
  -- El trigger copia cada fila borrada a la auditoría; también se eliminan para que el historial desaparezca por completo.
  delete from public.invayal_audit_log where entity = 'invayal_attendance';
  insert into public.invayal_audit_log(actor_user_id, entity, operation, after_data, reason)
  values (auth.uid(), 'invayal_attendance', 'HISTORY_PURGED', jsonb_build_object('records', removed), 'Borrado total del historial por administrador');
  return removed;
end;
$$;
revoke all on function invayal_private.invayal_purge_history(text) from public, anon;
grant execute on function invayal_private.invayal_purge_history(text) to authenticated;
create function public.invayal_purge_history(confirmation text) returns integer
language sql security invoker set search_path = '' as $$
  select invayal_private.invayal_purge_history(confirmation);
$$;
revoke all on function public.invayal_purge_history(text) from public, anon;
grant execute on function public.invayal_purge_history(text) to authenticated;
commit;
