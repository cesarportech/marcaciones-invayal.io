# Supabase de INVAYAL

Proyecto de producción verificado: `qaddywqskacyhxcpwdok` — `cesss239zzz's Project`.

## Aplicado

- Tablas `invayal_departments`, `invayal_employees`, `invayal_attendance_policy`, `invayal_attendance`, `invayal_audit_log`.
- Esquema privado `invayal_private` para funciones privilegiadas.
- RLS, índices, auditoría, control de sesiones y operaciones transaccionales de marcación/corrección.
- Edge Function `invayal-admin` para altas, contraseñas y estado de empleados.
- Cuenta inicial `administrador` con cambio de contraseña obligatorio.
- DEV local y PROD remoto; sin nueva rama ni proyecto de pruebas.

Las tablas y funciones ganaderas preexistentes se conservaron. No se importaron empleados ficticios.

## Migraciones

Los archivos en `migrations/` contienen el esquema de INVAYAL y la protección de sesiones. Los números de versión se alinean con las migraciones efectivamente aplicadas por el conector. `drafts/` conserva la propuesta inicial, no debe ejecutarse.

La configuración local usa PostgreSQL 17 y requiere Docker. El esquema remoto previo de la aplicación ganadera no se copia a DEV porque no es una dependencia de INVAYAL.

## Administración

El alta genera una identidad Auth interna a partir del usuario y fuerza un cambio de contraseña. La Edge Function usa la clave administrativa del entorno de Supabase, nunca el navegador. No envía correos. La cuenta desactivada no puede consultar sus datos ni marcar, aunque conserve un token.

Las correcciones exigen administrador y motivo. Para consultar auditoría se puede usar el panel SQL de Supabase, por ejemplo:

```sql
select occurred_at, actor_user_id, entity, operation, reason
from public.invayal_audit_log
order by occurred_at desc
limit 100;
```

## Verificación y avisos

Se verificaron inicio de sesión, cambio inicial obligatorio, rechazo de contraseñas cortas, denegación anónima, aislamiento por empleado, entrada/salida, duplicados, permisos de corrección y compilación estática.

El asesor de Supabase no señaló vulnerabilidades de las tablas o funciones de INVAYAL. Sí detectó avisos preexistentes en funciones ganaderas (`set_modificado_utc`, `confirmar_correo_sintetico`, `es_maestro`, `finca_accesible`) y protección de contraseñas filtradas desactivada en el proyecto compartido. Deben revisarse con el responsable de ese sistema antes de cambiar su configuración:
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Los avisos de índices sin uso en las nuevas tablas son esperables antes de tener tráfico.
