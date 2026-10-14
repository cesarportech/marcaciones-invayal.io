-- INVAYAL: esquema independiente de asistencia.
-- No altera ni elimina tablas existentes; usa nombres específicos de INVAYAL.
begin;
create schema invayal_private;
revoke all on schema invayal_private from public, anon;
grant usage on schema invayal_private to authenticated, service_role;

create table public.invayal_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 100)
);

create table public.invayal_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete restrict,
  username text not null unique check (username ~ '^[a-z0-9._]{3,30}$'),
  must_change_password boolean not null default true,
  full_name text not null check (length(trim(full_name)) between 3 and 150),
  department_id uuid not null references public.invayal_departments(id),
  role text not null default 'employee' check (role in ('employee', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index invayal_employees_department_idx on public.invayal_employees(department_id);

create table public.invayal_attendance_policy (
  id boolean primary key default true check (id),
  timezone text not null default 'America/Tegucigalpa' check (timezone = 'America/Tegucigalpa'),
  start_time time not null default '08:00',
  end_time time not null default '17:00',
  tolerance_minutes integer not null default 10 check (tolerance_minutes between 0 and 120),
  workdays integer[] not null default array[1,2,3,4,5,6]
    check (cardinality(workdays) between 1 and 7 and workdays <@ array[0,1,2,3,4,5,6]),
  check (end_time > start_time)
);

create table public.invayal_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.invayal_employees(id) on delete restrict,
  work_date date not null,
  clock_in timestamptz not null,
  clock_out timestamptz,
  scheduled_start time not null,
  tolerance_minutes integer not null check (tolerance_minutes between 0 and 120),
  timezone text not null check (timezone = 'America/Tegucigalpa'),
  unique (employee_id, work_date),
  check (clock_out is null or clock_out >= clock_in),
  check ((clock_in at time zone timezone)::date = work_date),
  check (clock_out is null or (clock_out at time zone timezone)::date = work_date)
);
create index invayal_attendance_date_idx on public.invayal_attendance(work_date desc);

create table public.invayal_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  occurred_at timestamptz not null default now(),
  entity text not null,
  operation text not null,
  before_data jsonb,
  after_data jsonb,
  reason text
);

create function invayal_private.invayal_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.invayal_employees
    where user_id = (select auth.uid()) and active and role = 'admin');
$$;

create function invayal_private.invayal_audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.invayal_audit_log(actor_user_id, entity, operation, before_data, after_data, reason)
  values (auth.uid(), tg_table_name, tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) else null end,
    case when tg_op <> 'DELETE' then to_jsonb(new) else null end,
    nullif(current_setting('invayal.correction_reason', true), ''));
  return coalesce(new, old);
end;
$$;

create trigger invayal_employee_audit after insert or update or delete on public.invayal_employees
for each row execute function invayal_private.invayal_audit_change();
create trigger invayal_policy_audit after insert or update or delete on public.invayal_attendance_policy
for each row execute function invayal_private.invayal_audit_change();
create trigger invayal_attendance_audit after insert or update or delete on public.invayal_attendance
for each row execute function invayal_private.invayal_audit_change();

alter table public.invayal_departments enable row level security;
alter table public.invayal_employees enable row level security;
alter table public.invayal_attendance_policy enable row level security;
alter table public.invayal_attendance enable row level security;
alter table public.invayal_audit_log enable row level security;

revoke all on public.invayal_departments, public.invayal_employees,
  public.invayal_attendance_policy, public.invayal_attendance, public.invayal_audit_log from anon, authenticated;
grant select on public.invayal_departments, public.invayal_employees,
  public.invayal_attendance_policy, public.invayal_attendance, public.invayal_audit_log to authenticated;
grant insert, update on public.invayal_departments to authenticated;
grant all on public.invayal_departments, public.invayal_employees, public.invayal_attendance_policy, public.invayal_attendance, public.invayal_audit_log to service_role;
grant update on public.invayal_attendance_policy to authenticated;

create policy invayal_employee_read on public.invayal_employees for select to authenticated
using ((user_id = (select auth.uid()) and active) or (select invayal_private.invayal_is_admin()));
create policy invayal_employee_insert on public.invayal_employees for insert to authenticated
with check ((select invayal_private.invayal_is_admin()));
create policy invayal_employee_update on public.invayal_employees for update to authenticated
using ((select invayal_private.invayal_is_admin())) with check ((select invayal_private.invayal_is_admin()));
create policy invayal_department_read on public.invayal_departments for select to authenticated
using (exists(select 1 from public.invayal_employees where user_id = (select auth.uid()) and active));
create policy invayal_department_insert on public.invayal_departments for insert to authenticated
with check ((select invayal_private.invayal_is_admin()));
create policy invayal_department_update on public.invayal_departments for update to authenticated
using ((select invayal_private.invayal_is_admin())) with check ((select invayal_private.invayal_is_admin()));
create policy invayal_policy_read on public.invayal_attendance_policy for select to authenticated
using (exists(select 1 from public.invayal_employees where user_id = (select auth.uid()) and active));
create policy invayal_policy_update on public.invayal_attendance_policy for update to authenticated
using ((select invayal_private.invayal_is_admin())) with check ((select invayal_private.invayal_is_admin()));
create policy invayal_attendance_read on public.invayal_attendance for select to authenticated
using ((select invayal_private.invayal_is_admin()) or exists(select 1 from public.invayal_employees e
  where e.id = employee_id and e.user_id = (select auth.uid()) and e.active));
create policy invayal_audit_read on public.invayal_audit_log for select to authenticated
using ((select invayal_private.invayal_is_admin()));

create function invayal_private.invayal_clock(kind text) returns public.invayal_attendance
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
  if employee.must_change_password then raise exception 'Cambia tu contraseña inicial antes de marcar.'; end if;
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

create function invayal_private.invayal_correct_attendance(record_id uuid, new_in timestamptz, new_out timestamptz, reason text)
returns public.invayal_attendance language plpgsql security definer set search_path = '' as $$
declare result public.invayal_attendance;
begin
  if not invayal_private.invayal_is_admin() then raise exception 'Se requiere acceso de RR. HH.'; end if;
  if reason is null or length(trim(reason)) < 10 then raise exception 'Explica el motivo de la corrección (mínimo 10 caracteres).'; end if;
  if new_in is null or new_in > clock_timestamp() or new_out > clock_timestamp() then raise exception 'Horario inválido o futuro.'; end if;
  perform set_config('invayal.correction_reason', trim(reason), true);
  update public.invayal_attendance set clock_in = new_in, clock_out = new_out where id = record_id returning * into result;
  if result.id is null then raise exception 'Registro no encontrado.'; end if;
  return result;
end;
$$;

revoke all on function invayal_private.invayal_is_admin() from public, anon;
revoke all on function invayal_private.invayal_audit_change() from public, anon, authenticated;
revoke all on function invayal_private.invayal_clock(text) from public, anon;
revoke all on function invayal_private.invayal_correct_attendance(uuid,timestamptz,timestamptz,text) from public, anon;
grant execute on function invayal_private.invayal_is_admin(), invayal_private.invayal_clock(text),
  invayal_private.invayal_correct_attendance(uuid,timestamptz,timestamptz,text) to authenticated;

insert into public.invayal_attendance_policy(id) values (true);
insert into public.invayal_departments(name) values
('Operaciones'), ('Ventas'), ('Finanzas'), ('Tecnología'), ('Recursos Humanos');
create function public.invayal_clock(kind text) returns public.invayal_attendance
language sql security invoker set search_path = '' as $$
  select invayal_private.invayal_clock(kind);
$$;
create function public.invayal_correct_attendance(record_id uuid, new_in timestamptz, new_out timestamptz, reason text)
returns public.invayal_attendance language sql security invoker set search_path = '' as $$
  select invayal_private.invayal_correct_attendance(record_id,new_in,new_out,reason);
$$;
revoke all on function public.invayal_clock(text), public.invayal_correct_attendance(uuid,timestamptz,timestamptz,text) from public, anon;
grant execute on function public.invayal_clock(text), public.invayal_correct_attendance(uuid,timestamptz,timestamptz,text) to authenticated;
grant usage, select on sequence public.invayal_audit_log_id_seq to service_role;
commit;
