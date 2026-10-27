# Rol superAdmin

Administra cuentas, roles, catálogos y configuración, pero no es "todopoderoso": toda acción administrativa
queda en la bitácora y hay cosas que nunca puede hacer.

## Qué valida el servidor en cada ruta de `/api/admin`

JWT válido + usuario activo en la base + rol `superAdmin` + permiso específico.
Los permisos salen del **rol que está en la base** (no del token), así que quitar el rol los quita al instante.

| Permiso | Para qué |
|---|---|
| `usuarios.gestionar` | Crear, consultar, actualizar, activar y suspender usuarios; técnicos |
| `roles.gestionar` | Cambiar el rol de otro usuario |
| `catalogos.gestionar` | Categorías, edificios y espacios (se desactivan, no se borran) |
| `incidencias.consultar_todas` | Ver todas las incidencias (lectura) |
| `bitacora.consultar` / `seguridad.consultar` | Bitácora administrativa y de seguridad |
| `metricas.consultar` / `sistema.consultar` | Resumen global, analítica y salud de API, MongoDB y almacenamiento |

## Lo que el superAdmin NO puede hacer

- Consultar contraseñas (se guardan con bcrypt y nunca se devuelven).
- Cambiar su propio rol ni suspender su propia cuenta.
- Dejar el sistema sin un superAdmin activo (no se puede degradar ni suspender al último).
- Borrar usuarios, incidencias, catálogos ni la bitácora: no existe ninguna ruta para eso.
- Modificar el historial de una incidencia (no tiene acceso a las rutas de edición ni de cambio de estado).
- Asignarse un rol desde el registro público: el registro rechaza `rol`, `permisos` o cualquier campo extra (400).

## Rutas

| Método y ruta | Permiso |
|---|---|
| `GET/POST /api/admin/usuarios` · `GET/PATCH /api/admin/usuarios/:id` · `PATCH /:id/estado` | `usuarios.gestionar` |
| `PATCH /api/admin/usuarios/:id/rol` | `roles.gestionar` |
| `GET /api/admin/tecnicos` · `PATCH /api/admin/tecnicos/:id` (disponibilidad y categorías) | `usuarios.gestionar` |
| `GET /api/admin/catalogos` · `PATCH .../categorias/:clave` · `POST .../edificios` · `PATCH .../edificios/:id` · `POST .../edificios/:id/espacios` · `PATCH .../espacios/:nombre` | `catalogos.gestionar` |
| `GET /api/admin/bitacora` · `GET /api/admin/seguridad` | `bitacora.consultar` · `seguridad.consultar` |
| `GET /api/admin/salud` · `GET /api/admin/resumen` | `sistema.consultar` · `metricas.consultar` |
| `GET /api/catalogos` (cualquier usuario con sesión) | solo lo activo, para los formularios |
| `POST /api/auth/registro` (público, 5 intentos por IP cada 15 min) | siempre crea un `reportante` |

## Bitácora (colección `bitacora`, solo se agrega)

- `tipo: "admin"`: usuario.crear, usuario.actualizar, usuario.cambiar_rol, usuario.activar, usuario.suspender, tecnico.actualizar, catalogo.*
- `tipo: "seguridad"`: login.ok, login.fallido (sin contraseña), acceso.denegado (403), usuario.registro

## Catálogos

- Categorías: las 3 claves del esquema de MongoDB (`computo_redes`, `infraestructura`, `academico`). Se pueden renombrar y desactivar, no crear otras
  (cada categoría tiene su propio bloque `detalle_especifico` validado por `$jsonSchema`).
- Edificios y espacios: se pueden crear, renombrar y desactivar. Si un edificio tiene espacios, al reportar el espacio se elige de la lista.
- Mientras la colección `catalogos` esté vacía, el sistema se comporta como antes. Se siembra sola la primera vez que el superAdmin edita algo.

## Variables

- `REGISTRO_ABIERTO=false` desactiva el registro público.
