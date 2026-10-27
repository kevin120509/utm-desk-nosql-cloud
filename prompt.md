Revisa el repositorio UTM Desk y desarrolla el módulo administrativo del rol `superAdmin`, modificando frontend y backend de forma coordinada.

Antes de programar:

1. Revisa la estructura real del repositorio.
2. Identifica si el backend usa JavaScript o TypeScript.
3. Identifica cómo funciona actualmente la autenticación.
4. Revisa las rutas existentes, modelos MongoDB, middlewares y componentes frontend.
5. Revisa el JSON actual de las incidencias y conserva sus nombres de campos.
6. No inventes una arquitectura diferente si ya existe una implementación funcional.
7. No crees usuarios automáticamente.
8. No escribas contraseñas, tokens ni variables secretas en el código.

## Rol administrativo

Utiliza exactamente el rol:

```text
superAdmin
```

El `superAdmin` podrá administrar usuarios, permisos, catálogos y configuración general, pero todas las acciones administrativas deberán quedar registradas.

## Páginas frontend

Crea o adapta las siguientes rutas:

```text
/admin
/admin/usuarios
/admin/roles
/admin/catalogos
/admin/incidencias
/admin/bitacora
/admin/metricas
/admin/sistema
```

### `/admin`

Dashboard administrativo con:

- Total de usuarios.
- Usuarios activos y suspendidos.
- Incidencias abiertas, en proceso, resueltas y cerradas.
- Incidencias por categoría.
- Incidencias por edificio.
- Estado general de la API, MongoDB y almacenamiento.
- Accesos rápidos a usuarios, roles y bitácora.

### `/admin/usuarios`

Debe permitir:

- Consultar usuarios.
- Buscar por nombre o correo.
- Filtrar por rol y estado.
- Activar o suspender usuarios.
- Consultar el detalle de un usuario.
- Asignar o retirar roles.
- Mostrar confirmación antes de cambios importantes.
- No mostrar contraseñas.
- No permitir eliminar al último `superAdmin`.

### `/admin/roles`

Debe permitir:

- Consultar roles existentes.
- Mostrar permisos de cada rol.
- Asignar roles a usuarios.
- Retirar roles.
- Evitar que un usuario público seleccione roles administrativos.
- Mostrar advertencia antes de cambiar permisos elevados.

Roles válidos:

```text
reportante
tecnico
coordinador
directivo
soporteTI
superAdmin
```

El bot asistente no debe tratarse como usuario administrativo.

### `/admin/catalogos`

Administrar:

- Categorías de incidencias.
- Edificios.
- Ubicaciones.
- Tipos de ubicación.
- Técnicos.
- Categorías asignadas a cada técnico.
- Disponibilidad de técnicos.

No elimines físicamente catálogos utilizados por incidencias históricas. Usa estados como `activo` e `inactivo`.

### `/admin/incidencias`

Debe permitir al `superAdmin`:

- Consultar todas las incidencias.
- Buscar por código, título o descripción.
- Filtrar por estado, categoría, prioridad y edificio.
- Consultar el documento completo.
- Consultar historial y evidencias.
- Ver quién creó y modificó cada registro.

No debe permitir alterar directamente el historial operativo ni eliminar incidencias permanentemente.

### `/admin/bitacora`

Mostrar:

- Usuario que realizó la acción.
- Acción ejecutada.
- Módulo afectado.
- Identificador del registro afectado.
- Fecha y hora.
- Resultado de la operación.
- Dirección IP o información técnica disponible, sin exponer secretos.

### `/admin/metricas`

Mostrar métricas provenientes de MongoDB:

- Incidencias por categoría.
- Incidencias por estado.
- Incidencias por prioridad.
- Incidencias por edificio.
- Tiempo promedio de resolución.
- Técnicos con más incidencias asignadas.
- Incidencias recurrentes.

### `/admin/sistema`

Mostrar:

- Estado de la API.
- Estado de conexión con MongoDB.
- Estado del almacenamiento de evidencias.
- Versión o entorno de ejecución.
- Último error registrado, sin mostrar secretos.
- Fecha de la última comprobación.

## Backend

Implementa o adapta middleware para validar:

```text
JWT válido
+
usuario activo
+
rol superAdmin
+
permiso requerido
```

No confíes únicamente en la protección visual del frontend.

Rutas sugeridas:

```text
GET    /api/admin/usuarios
GET    /api/admin/usuarios/:id
PATCH  /api/admin/usuarios/:id/estado
PATCH  /api/admin/usuarios/:id/roles

GET    /api/admin/roles
GET    /api/admin/permisos

GET    /api/admin/catalogos
POST   /api/admin/catalogos
PATCH  /api/admin/catalogos/:id

GET    /api/admin/incidencias
GET    /api/admin/incidencias/:id

GET    /api/admin/bitacora
GET    /api/admin/metricas
GET    /api/admin/sistema
```

Antes de crear una ruta, revisa si ya existe una equivalente y reutilízala.

## Integración con MongoDB

Usa las colecciones existentes. Como referencia, revisa especialmente:

```text
incidencias_campus
ubicaciones
tecnicos
usuarios o perfiles
bitacora administrativa
```

Cada incidencia debe conservar su estructura documental actual, incluyendo:

```text
codigo
titulo
descripcion
categoria
prioridad
estado
reportante
ubicacion
tecnico_asignado
detalle_especifico
tags
historial_seguimiento
evidencias_adjuntas
horas_invertidas
fecha_creacion
fecha_resolucion
```

Las categorías deben conservar sus estructuras específicas:

```text
computo_redes
infraestructura_fisica
servicios_academicos
```

No mezcles campos de una categoría con otra. Usa validaciones para rechazar documentos incompletos o incompatibles.

## Seguridad

- No expongas `MONGODB_URI`.
- No expongas contraseñas.
- No guardes contraseñas sin hash.
- No incluyas secretos en respuestas JSON.
- Valida los datos recibidos en el backend.
- Aplica CORS únicamente a los orígenes configurados.
- Registra las acciones administrativas.
- Usa desactivación lógica en lugar de eliminación física.
- No permitas que un `superAdmin` elimine al último usuario con ese rol.

## Pruebas

Agrega pruebas para:

1. Acceso permitido de `superAdmin`.
2. Acceso rechazado de `reportante`.
3. Acceso rechazado sin token.
4. Acceso rechazado con token vencido.
5. Consulta de usuarios.
6. Cambio de estado de usuario.
7. Asignación de roles.
8. Protección del último `superAdmin`.
9. Consulta de incidencias.
10. Consulta de métricas.
11. Registro de acciones en bitácora.
12. Validación de categorías y documentos JSON.

## Entrega

Antes de terminar:

1. Muestra los archivos modificados.
2. Explica las rutas frontend creadas.
3. Explica las rutas backend creadas o reutilizadas.
4. Indica cómo se relacionan con MongoDB.
5. Muestra ejemplos de respuestas JSON sin datos sensibles.
6. Ejecuta las pruebas disponibles.
7. Indica qué quedó pendiente.
8. No crees usuarios reales.
9. No ejecutes migraciones destructivas.
10. No hagas commit ni despliegue sin autorización.