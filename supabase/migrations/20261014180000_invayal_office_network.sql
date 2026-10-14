begin;
-- Restringe las marcaciones a la red (IP pública) de la oficina.
alter table public.invayal_attendance_policy
  add column office_ips inet[] not null default '{}',
  add column require_office_network boolean not null default false,
  add constraint invayal_office_network_needs_ips check (not require_office_network or cardinality(office_ips) > 0);

alter table public.invayal_attendance
  add column clock_in_ip inet,
  add column clock_out_ip inet;

-- IP pública del cliente. Se prefiere cf-connecting-ip: lo fija Cloudflare (delante de Supabase) y el cliente
-- no puede sobrescribirlo. x-forwarded-for sí es falsificable: solo se usa su último valor, el que agrega el proxy.
create function invayal_private.invayal_request_ip() returns inet
language plpgsql stable security definer set search_path = '' as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  forwarded text;
begin
  if headers is null then return null; end if;
  if nullif(trim(headers->>'cf-connecting-ip'), '') is not null then
    return trim(headers->>'cf-connecting-ip')::inet;
  end if;
  forwarded := nullif(trim(regexp_replace(coalesce(headers->>'x-forwarded-for', ''), '^.*,', '')), '');
  return forwarded::inet;
exception when others then
  return null;
end;
$$;
revoke all on function invayal_private.invayal_request_ip() from public, anon, authenticated;

-- Diagnóstico para el administrador: qué IP ve el servidor y si está permitida.
create function invayal_private.invayal_network_info() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  ip inet := invayal_private.invayal_request_ip();
  policy public.invayal_attendance_policy;
begin
  if not invayal_private.invayal_is_admin() then raise exception 'Se requiere acceso de RR. HH.'; end if;
  select * into strict policy from public.invayal_attendance_policy where id;
  return jsonb_build_object('ip', host(ip), 'allowed', ip is not null and ip <<= any(policy.office_ips));
end;
$$;
revoke all on function invayal_private.invayal_network_info() from public, anon;
grant execute on function invayal_private.invayal_network_info() to authenticated;
create function public.invayal_network_info() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select invayal_private.invayal_network_info();
$$;
revoke all on function public.invayal_network_info() from public, anon;
grant execute on function public.invayal_network_info() to authenticated;

create or replace function invayal_private.invayal_clock(kind text) returns public.invayal_attendance
language plpgsql security definer set search_path = '' as $$
declare
  employee public.invayal_employees;
  policy public.invayal_attendance_policy;
  result public.invayal_attendance;
  instant timestamptz;
  local_date date;
  ip inet;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if kind is null or kind not in ('in', 'out') then raise exception 'Marcación inválida.'; end if;
  -- El bloqueo por empleado serializa solicitudes simultáneas.
  select * into employee from public.invayal_employees where user_id = auth.uid() for update;
  if employee.id is null or not employee.active then raise exception 'Cuenta no habilitada.'; end if;
  select * into strict policy from public.invayal_attendance_policy where id;
  ip := invayal_private.invayal_request_ip();
  if policy.require_office_network and (ip is null or not (ip <<= any(policy.office_ips))) then
    raise exception 'Debes estar conectado a la red de la oficina.';
  end if;
  instant := clock_timestamp();
  local_date := (instant at time zone policy.timezone)::date;
  if not (extract(dow from local_date)::integer = any(policy.workdays)) then
    raise exception 'Día de descanso.';
  end if;
  if kind = 'in' then
    if exists(select 1 from public.invayal_attendance where employee_id = employee.id and work_date = local_date) then
      raise exception 'Ya registraste la entrada de hoy.';
    end if;
    insert into public.invayal_attendance(employee_id, work_date, clock_in, clock_in_ip, scheduled_start, tolerance_minutes, timezone)
    values (employee.id, local_date, instant, ip, policy.start_time, policy.tolerance_minutes, policy.timezone)
    returning * into result;
  else
    update public.invayal_attendance set clock_out = instant, clock_out_ip = ip
    where employee_id = employee.id and work_date = local_date and clock_out is null returning * into result;
    if result.id is null then raise exception 'No hay entrada abierta para hoy.'; end if;
  end if;
  return result;
end;
$$;
commit;
