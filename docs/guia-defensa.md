# Guía de defensa individual (D04)

Proyecto: UTM Desk NoSQL Cloud. Reparto sugerido por caso de uso (cada integrante defiende el suyo y conoce los demás a grandes rasgos):

| Integrante | Casos de uso | Archivos clave |
|---|---|---|
| Vargas Guzmán Kevin Aarón | CU-01 Alta + contador, arquitectura y despliegue | `application/registrarIncidencia.js`, `infrastructure/mongo/contadorMongo.js`, `src/aplicacion.js`, `api/index.js` |
| Arroyo León Luis Diego | CU-03 Estado y bitácora, concurrencia (409) | `application/actualizarEstado.js`, `domain/transiciones.js`, `incidenciasRepo.js` (`actualizarEstado`) |
| Can Domínguez Víctor Emmanuel | CU-02 Evidencias, CU-04 Etiquetas | `application/cargarEvidencia.js`, `infrastructure/archivos/detectarTipo.js`, `almacen/almacenSupabase.js`, `etiquetasRepo.js` |
| Montalvo Canché Emir Emanuel | CU-05 Búsqueda, CU-06 Analítica, CU-07 TTL | `application/buscarIncidencias.js`, `analiticaRepo.js`, `indices.js`, `scripts/demo-ttl.js` |

## Preguntas generales

**¿Por qué MongoDB y no SQL?** Tres categorías con datos específicos distintos. Un solo documento por incidencia con `detalle_especifico` polimórfico, bitácora, etiquetas y evidencias embebidas: el expediente se lee en una operación, sin joins.

**¿Cómo garantizan que `detalle_especifico` corresponde a la categoría?** Dos capas: Zod en la API (`domain/esquemas.js`) y `$jsonSchema` con `oneOf` en la colección (`mongo/validador.js`). Si Zod falla por error, Mongo rechaza el insert.

**¿Dónde están los binarios?** En un bucket privado de Supabase Storage (`evidencias`). Mongo guarda solo metadatos (`nombre_archivo`, `tipo_mime`, `peso_kb`, `storage_path`, URL firmada y su expiración).

**¿Por qué no Redis?** El docente aceptó el contador en MongoDB (colección `contadores`, `$inc` con `upsert`).

**¿Cómo se protege?** bcrypt, JWT 8 h, roles validados en el servidor, `helmet`, CORS solo al origen de la web, límite de peticiones, Zod estricto (rechaza operadores como `$ne`), bucket privado, secretos solo en variables de entorno. Detalle en `docs/revision-R05-seguridad.md`.

## CU-01 Alta y contador (Kevin)

- **Flujo:** `POST /api/incidencias` → Zod valida → `contadorMongo` obtiene consecutivo diario y anual → se inserta con estado `abierta`, bitácora inicial, `tags: []`, `evidencias_adjuntas: []`, `horas_invertidas: 0`.
- **¿Qué evita duplicar números?** `findOneAndUpdate` con `$inc` y `upsert: true` sobre `contador:incidencias:YYYY-MM-DD:categoria`; es atómico. Prueba: 20 llamadas paralelas devuelven 20 números distintos.
- **¿Y si falla el insert tras consumir un número?** Queda un hueco en la numeración; es aceptable y está documentado.
- **¿De dónde sale el reportante?** De la sesión (JWT), no del cuerpo.
- **¿Cómo desplegaron?** Dos proyectos Vercel: API (`server/api/index.js` exporta la app Express como función serverless) y web estática; Atlas con Network Access abierto porque las IP de Vercel cambian.

## CU-03 Estado y bitácora (Luis Diego)

- **Flujo:** `PATCH /api/incidencias/:codigo/estado` con `estado_nuevo`, `horas`, `comentario`.
- **Un solo `updateOne`:** `$set` (estado, `fecha_actualizacion`, `fecha_resolucion` si es resuelta) + `$push` a `historial_seguimiento` + `$inc` a `horas_invertidas`.
- **¿Cómo evitan la condición de carrera?** El filtro incluye el estado leído: `{ codigo, estado: estadoLeido }`. Si `matchedCount` es 0, otra persona lo cambió y se responde 409 sin modificar nada. Prueba con dos PATCH simultáneos: 200 y 409.
- **Transiciones válidas:** `domain/transiciones.js`. Resuelta solo pasa a cerrada y solo la hace el coordinador. Horas entre 0 y 24.
- **¿Por qué `fecha_resolucion` solo en resuelta/cerrada?** El validador lo exige y el TTL depende de ese campo.

## CU-02 Evidencias y CU-04 Etiquetas (Víctor)

- **Evidencias:** multer en memoria, límite 4 MB; `detectarTipo.js` lee la firma de bytes (no confía en extensión ni en `Content-Type`). `.exe` renombrado a `.png`, 0 bytes y > 4 MB dan 400 sin subir nada.
- **URL firmada:** se genera al subir y se regenera cada vez que se consulta el expediente; así no caduca para el usuario.
- **Permisos:** técnico, coordinador y el reportante dueño.
- **Etiquetas:** se normalizan (minúsculas, sin espacios sobrantes); `$addToSet` evita duplicados (`Switch ` y `switch` son una), `$pull` elimina.

## CU-05 Búsqueda, CU-06 Analítica y CU-07 TTL (Emir)

- **Búsqueda:** índice `idx_texto_es` sobre `titulo` (peso 10) y `descripcion` (peso 5), idioma español: "filtración" encuentra "filtraciones". Se proyecta `score: { $meta: "textScore" }` y se ordena por relevancia. `explain()` muestra etapa `TEXT_MATCH`. Las etiquetas no están en el índice.
- **Pipeline 1 (por edificio):** `$match` resuelta/cerrada → `$addFields` con `$dateDiff` en horas → `$group` por `ubicacion.edificio` (promedio, suma de horas, conteo) → `$sort` descendente.
- **Pipeline 2 (etiquetas):** `$unwind` de `tags` → `$group` con conteo y edificios → `$sort` → `$limit` 10.
- **TTL:** índice `idx_ttl_resolucion` sobre `fecha_resolucion` con `expireAfterSeconds: 5184000` (60 días). El monitor de Mongo corre cada ~60 s. `npm run demo:ttl` siembra un documento de 61 días (desaparece) y uno de 59 (permanece).
- **¿Qué pasa si abren un enlace de una incidencia depurada?** La API responde 404 y la UI muestra "no existe o ya fue depurada".

## Índices (los 5)

`idx_cat_estado_edificio` (listados filtrados), `idx_ttl_resolucion`, `idx_texto_es`, `idx_codigo` (único), `idx_reportante` (el reportante ve solo las suyas, ordenadas por fecha).

## Preguntas trampa

- **¿Por qué 4 prioridades si el enunciado menciona 3?** Decisión del equipo: se añadió `crítica`; está en el enum del validador.
- **¿Por qué el rate limit es por instancia en Vercel?** Cada función serverless tiene memoria propia; mitiga fuerza bruta pero no es global. Riesgo aceptado en R05.
- **¿Dónde guarda la sesión la web?** `localStorage`; riesgo aceptado (si hubiera XSS se podría robar el token); React escapa el contenido por defecto y no se usa HTML dinámico.
- **¿Qué falta por probar?** `mongosh` real sobre el script maestro (se probó con el driver en una base vacía).
