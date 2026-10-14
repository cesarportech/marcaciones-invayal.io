# INVAYAL · Control de asistencia

Aplicación en español con Next.js, React y Supabase. Se publica como HTML/CSS/JavaScript estático en GitHub Pages; los datos y la autenticación permanecen en Supabase.

## Producción

- Proyecto Supabase: `cesss239zzz's Project` (`qaddywqskacyhxcpwdok`).
- Dirección de publicación: https://cesarportech.github.io/marcaciones-invayal.io/
- Inicio de sesión por usuario y contraseña. El identificador interno de Auth usa el dominio reservado `invayal.invalid`; no se solicita correo ni se envían mensajes.
- La cuenta inicial es `administrador`. Su contraseña temporal se entrega en un archivo privado local, excluido de Git, y debe cambiarse al primer ingreso.
- Las claves en `config/production.json` son publicables. La clave administrativa solo existe en el entorno de la Edge Function de Supabase.

## Funciones

Empleados: entrada, salida, historial y cambio de contraseña.
Administrador: altas, activación/desactivación, restablecimiento de contraseñas, reportes Excel/PDF, búsqueda y filtros, y corrección de jornadas con motivo obligatorio.

Las marcaciones usan la hora del servidor de Supabase y la fecha de Honduras. Se impiden duplicados y salidas sin entrada. Los empleados solo leen sus registros; las cuentas inactivas pierden acceso. El restablecimiento invalida las sesiones existentes. Los cambios quedan auditados.

Política inicial: lunes a sábado, 08:00–17:00, tolerancia hasta el minuto 08:10 inclusive y domingo de descanso. La política se guarda en la base; cada jornada conserva el horario y tolerancia aplicados. La revisión de RR. HH. debe confirmar esta política antes de usarla con personal real.

El sistema muestra tiempo transcurrido sin descontar pausas. No calcula nómina, horas extra, vacaciones o feriados; no inventa ausencias por falta de marcación. No admite turnos nocturnos ni múltiples jornadas por día. Las jornadas anteriores sin salida quedan identificadas como pendientes.

## DEV local

Requiere Node.js 24, npm y Docker Desktop en funcionamiento. No hay entorno staging.

```sh
npm ci
npx supabase start
npm run dev:configure
npx supabase functions serve invayal-admin --no-verify-jwt
```

En otra terminal:

```sh
npm run dev
```

`dev:configure` genera `.env.development.local` con la URL y clave pública del Supabase local. No usa producción como alternativa. Si falta la configuración, la pantalla lo indica.

Las migraciones inicializan las tablas locales. `dev:configure` crea el primer administrador DEV si aún no existe y guarda su contraseña temporal en `.invayal-private/ACCESO-DEV.txt`. No copia usuarios ni contraseñas de producción.

En este equipo no se encontró Docker, por lo que el backend DEV local todavía no se ha iniciado. La compilación estática y la conexión de producción sí se verificaron.

## Construir y publicar

```sh
npm test
npm run typecheck
npm run build:pages
npm start
```

Se genera `out/index.html` junto con todos sus recursos. La vista previa de esa compilación está en http://localhost:4173/marcaciones-invayal.io/ y utiliza el backend de producción. No abrir el HTML por doble clic: servir toda la carpeta por HTTP.

GitHub Actions ejecuta el workflow **Publicar INVAYAL en GitHub Pages** al subir cambios a `main`. En Settings → Pages, la fuente debe ser GitHub Actions. Las migraciones y Edge Functions se despliegan por separado a Supabase y se versionan en `supabase/`.

Se usa `package-lock.json` y `npm ci`. Los archivos pnpm originales se conservan como referencia; no se usan en CI. La interfaz de demostración anterior permanece como código legado sin ruta pública y no es la aplicación publicada.

## Seguridad y comprobaciones

- RLS y permisos explícitos en todas las tablas INVAYAL.
- Funciones privilegiadas en esquema privado; las funciones públicas de marcación son wrappers con validación de sesión.
- La Edge Function valida el usuario, sesión vigente, estado y rol antes de operar. Su autenticación está implementada en el código, por eso el gateway usa `verify_jwt=false`.
- Sin contraseñas de empleados en tablas, exportaciones ni código público.
- Validaciones transaccionales verificadas en Supabase con rollback: aislamiento, duplicados, secuencia de marcación y correcciones administrativas.
- `scripts/verify-connection.mjs` verifica el acceso inicial con el archivo privado local; deja de ser aplicable después de cambiar esa contraseña.
- Reporte de configuración y avisos preexistentes: `supabase/README.md`.
- CSS de variantes derivado de shadcn/ui, licencia en `licenses/shadcn-MIT.txt`.
