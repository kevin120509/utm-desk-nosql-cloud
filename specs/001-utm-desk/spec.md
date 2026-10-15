# Spec 001 — UTM Desk NoSQL Cloud

Estado: **BORRADOR para aprobación de Kevin** · Fecha: 2026-10-15 · Fuente: `docs/enunciado.pdf`

Esta spec dice QUÉ y POR QUÉ. El CÓMO está en `plan.md`.

## 1. Contexto y objetivo
El campus recibe incidencias de tres fuentes con datos muy distintos (cómputo y redes, infraestructura física, sistemas académicos). Las hojas de cálculo y los correos dispersan la trazabilidad y no permiten medir tiempos de resolución ni fallas crónicas. UTM Desk centraliza las incidencias en MongoDB Atlas con un modelo documental polimórfico, evidencias en un bucket, búsqueda textual y analítica por edificio.

Objetivo medible: demostrar en vivo, sobre la nube, el ciclo completo de una incidencia (alta → evidencia → seguimiento → etiquetas → búsqueda → analítica → depuración automática).

## 2. Alcance
**Dentro:** los 7 casos de uso del enunciado, login con roles, UI web, API REST, script maestro, colección Postman, despliegue en la nube, los dos PDF.
**Fuera:** notificaciones por correo, app móvil, chat, asignación automática, reabrir incidencias, edición de usuarios desde la UI, soporte multi-campus.

## 3. Actores y roles
| Rol | Quién | Puede |
|---|---|---|
| reportante | Docente, estudiante o administrativo | Crear incidencias, ver las suyas, subir evidencia a las suyas |
| tecnico | Técnico operativo/asignado | Ver todas, cambiar estado, horas y bitácora, etiquetas, evidencias |
| coordinador | Coordinador de soporte/área | Todo lo del técnico, cerrar, editar campos universales, borrar, analítica |
| directivo | Coordinación UTM / Dirección | Solo lectura, búsqueda y analítica |

## 4. Requisitos funcionales (EARS)

**RF-01 Registrar incidencia (CU-01).** Cuando un usuario autenticado envía `POST /api/incidencias` con los campos universales (`titulo`, `descripcion`, `categoria`, `prioridad`, `ubicacion`) y un `detalle_especifico` válido para su categoría, el sistema deberá insertar el documento con `estado: "abierta"`, `historial_seguimiento` con una entrada inicial, `tags: []`, `evidencias_adjuntas: []`, `horas_invertidas: 0`, un `codigo` formal `INC-AAAA-NNNN`, y responder 201 con el documento. El `reportante` se toma de la sesión, no del cuerpo.

**RF-02 Validación del alta.** Si el cuerpo no cumple la validación (campo faltante, enum inválido, `detalle_especifico` que no corresponde a la categoría, campos extra), entonces el sistema deberá responder 400 con la lista de errores y no deberá insertar nada. Mongo rechaza lo que Zod deje pasar por error (segunda línea de defensa con `$jsonSchema`).

**RF-03 Contador.** Cuando se registra una incidencia, el sistema deberá incrementar de forma atómica (`findOneAndUpdate` con `$inc` y `upsert`) el documento `contador:incidencias:YYYY-MM-DD:categoria` de la colección `contadores` y guardar el valor como `consecutivo_diario`; además deberá obtener el consecutivo anual para el `codigo`. (Decisión 2026-10-15: el docente aceptó el contador en MongoDB; no se usa Redis.)

**RF-04 Cargar evidencia (CU-02).** Cuando el reportante dueño o un técnico/coordinador sube un archivo jpeg, png o pdf de máximo 4 MB a `POST /api/incidencias/:codigo/evidencias`, el sistema deberá guardarlo en el bucket, generar una URL firmada temporal y hacer `$push` en `evidencias_adjuntas` con `nombre_archivo`, `tipo_mime`, `peso_kb`, `storage_path`, `url_storage`, `url_expira` y `fecha_carga`. Si la incidencia no existe, responder 404. Si el tipo o tamaño no es válido, responder 400 sin subir nada.

**RF-05 Consultar expediente.** Cuando se consulta `GET /api/incidencias/:codigo`, el sistema deberá devolver el documento completo en una sola lectura, con las URLs firmadas de las evidencias regeneradas. Un reportante solo puede ver las suyas (si no, 403).

**RF-06 Listar y filtrar.** Cuando se consulta `GET /api/incidencias` con filtros opcionales (`categoria`, `estado`, `edificio`, `prioridad`, `pagina`, `limite`), el sistema deberá devolver los resultados paginados ordenados por fecha de creación descendente, apoyándose en el índice compuesto.

**RF-07 Actualizar estado y bitácora (CU-03).** Cuando un técnico o coordinador envía `PATCH /api/incidencias/:codigo/estado` con `estado_nuevo`, `horas` y `comentario`, y la transición es válida, el sistema deberá ejecutar un único `updateOne` con `$set` (estado, `fecha_actualizacion`, y `fecha_resolucion` si pasa a resuelta), `$push` en `historial_seguimiento` y `$inc` en `horas_invertidas`. Si la incidencia ya no está en el estado que el servidor leyó (otra persona la cambió), entonces deberá responder 409 sin modificar nada. Si la transición no es válida, responder 400.

**RF-08 Etiquetas (CU-04).** Cuando un técnico o coordinador envía `POST /api/incidencias/:codigo/tags`, el sistema deberá usar `$addToSet` (si ya existe, el arreglo queda igual y responde 200). Cuando envía `DELETE /api/incidencias/:codigo/tags/:tag`, deberá usar `$pull`. Las etiquetas se normalizan a minúsculas y sin espacios sobrantes.

**RF-09 Búsqueda textual (CU-05).** Cuando se consulta `GET /api/incidencias/buscar?q=...`, el sistema deberá ejecutar `$text: { $search }` con el índice ponderado en español, proyectar `score: { $meta: "textScore" }` y ordenar por relevancia descendente. Un reportante solo obtiene resultados de sus propias incidencias. Si `q` está vacío, responder 400.

**RF-10 Analítica (CU-06).** Cuando un coordinador o directivo consulta `GET /api/analitica/edificios`, el sistema deberá ejecutar el Pipeline 1 (`$match` resuelta/cerrada, horas transcurridas, `$group` por edificio con promedio, total de horas y conteo, `$sort` descendente). Cuando consulta `GET /api/analitica/tags`, deberá ejecutar el Pipeline 2 (`$unwind` de `tags`, `$group`, `$sort` descendente, `$limit` 10).

**RF-11 Depuración automática (CU-07).** Mientras exista un documento con `fecha_resolucion`, el índice TTL de 60 días deberá eliminarlo cuando se cumplan 60 días naturales. El sistema deberá asentar `fecha_resolucion` como `Date` al resolver. Los estados abierta, en proceso y en espera nunca tienen ese campo.

**RF-12 Editar y borrar (CRUD completo).** Cuando un coordinador envía `PATCH /api/incidencias/:codigo` con campos universales editables (`titulo`, `descripcion`, `prioridad`, `ubicacion`), el sistema deberá actualizarlos con `$set` y devolver 200. Cuando envía `DELETE /api/incidencias/:codigo`, deberá eliminar el documento y sus archivos del bucket y responder 200.

**RF-13 Sesión y permisos.** Cuando un usuario envía `POST /api/auth/login` con credenciales válidas, el sistema deberá devolver un JWT. Si falta el token o es inválido, responder 401. Si el rol no tiene permiso, responder 403.

**RF-14 Datos de demostración.** El sistema deberá incluir un script que cree la colección con su validador e índices y cargue 24 incidencias sintéticas (ver plan §9) y los usuarios de demo, y un script que exporte el JSON final y el script maestro de `mongosh`.

**RF-15 Interfaz.** La UI web deberá permitir: iniciar sesión; crear incidencias con un formulario que cambia según la categoría; listar, filtrar y buscar; ver el expediente con bitácora, evidencias y etiquetas; actualizar estado (técnico/coordinador); y ver la analítica (coordinador/directivo).

## 5. Requisitos no funcionales
- **RNF-01 Rendimiento:** el expediente se lee en una sola operación (sin joins ni lookups); listados y búsqueda usan índice (`IXSCAN` / `TEXT` en `explain()`).
- **RNF-02 Almacenamiento:** la base cabe en los 512 MB de M0; ningún binario en Mongo.
- **RNF-03 Seguridad:** bcrypt, JWT, `helmet`, CORS restringido, límite de peticiones, validación de entrada, bucket privado, secretos solo en variables de entorno.
- **RNF-04 Integridad:** validación en dos capas; cambios de estado atómicos y sin condición de carrera.
- **RNF-05 Disponibilidad en demo:** API y UI desplegadas en la nube (Vercel) contra Atlas; la demo no depende de la laptop.
- **RNF-06 Usabilidad:** UI en español, usable en móvil, estados vacíos y mensajes de error claros.
- **RNF-07 Mantenibilidad:** arquitectura limpia, pruebas automáticas, README y guía de defensa.
- **RNF-08 Entrega:** PDF en APA 7.ª edición, repositorio Git, colección Postman exportada, script maestro.

## 6. Casos límite
1. Dos técnicos cambian el estado a la vez → uno recibe 409 y no se pierden horas ni bitácora.
2. Enviar `detalle_especifico` de otra categoría → 400.
3. Etiqueta repetida con distinto formato (`Switch ` / `switch`) → una sola.
4. Archivo de 0 bytes, de más de 4 MB, o `.exe` renombrado como `.png` → 400 (se valida el mime real, no solo la extensión).
5. Cambiar estado de una incidencia cerrada o resuelta (excepto resuelta → cerrada por coordinador) → 400.
6. `horas` negativas, no numéricas o mayores a 24 por intervención → 400.
7. Búsqueda con acentos o plurales (`filtración`, `filtraciones`) → el índice en español los trata como la misma raíz.
8. Una incidencia resuelta hace 61 días desaparece sola; la UI debe manejar 404 al abrir un enlace viejo.
9. El enlace firmado de una evidencia caduca → el detalle lo regenera al consultarse.
10. Redis caído → fallback a `contadores` sin que el usuario lo note.
11. Error al guardar en Mongo después de consumir un número del contador → hay un hueco en la numeración (aceptable, documentado).
12. Página sin resultados, lista vacía o analítica sin datos → mensajes vacíos, no pantallas rotas.

## 7. Criterios de validación (RF → evidencia)
| RF | Cómo se valida |
|---|---|
| RF-01/02 | Postman: POST válido 201, POST inválido 400; documento visible en Atlas |
| RF-03 | Test de contador + dos altas seguidas con consecutivos distintos |
| RF-04 | Postman con archivo; objeto en el bucket; `$push` visible en Atlas |
| RF-05/06 | Postman GET 200; `explain()` con `IXSCAN` |
| RF-07 | Test de concurrencia (dos PATCH paralelos → 200 y 409); horas acumuladas correctas |
| RF-08 | Dos POST iguales → una etiqueta; DELETE la quita |
| RF-09 | Resultados ordenados por `score`; `explain()` con etapa `TEXT` |
| RF-10 | Los dos pipelines devuelven lo calculado a mano con el seed |
| RF-11 | Documento sembrado con 61 días desaparece en ≤ 2 min; con 59 días permanece |
| RF-12 | Postman PATCH 200 y DELETE 200 |
| RF-13 | Postman 401 y 403 |
| RF-14 | `db:seed` deja 24 documentos con las cuentas del §9 del plan; `db:export` genera archivos |
| RF-15 | Recorrido manual por cada rol |

## 8. Dudas (con valor por defecto para no bloquear)
Resueltas el 2026-10-15:
1. **Integrantes:** 4 (Arroyo León Luis Diego, Can Domínguez Víctor Emmanuel, Montalvo Canché Emir Emanuel, Vargas Guzmán Kevin Aarón). La guía de defensa se organiza por caso de uso para repartirlos.
2. **Fechas:** Fase 1 es hoy (2026-10-15); D01 va primero. Fecha de Fase 2 pendiente.
3. **Redis:** NO. El docente aceptó el contador en MongoDB (colección `contadores`).
4. **Bucket:** Supabase Storage, confirmado por el docente.
5. **Cluster de Atlas:** una sola cuenta (la de Kevin), con un usuario de BD `readWrite` para el servidor y otro de solo lectura para el equipo.
