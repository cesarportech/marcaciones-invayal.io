insert into public.invayal_departments(name) values ('Contabilidad') on conflict (name) do nothing;
update public.invayal_employees set department_id = (select id from public.invayal_departments where name = 'Contabilidad') where department_id is distinct from (select id from public.invayal_departments where name = 'Contabilidad');
