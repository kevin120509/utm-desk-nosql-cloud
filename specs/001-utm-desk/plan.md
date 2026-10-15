# Plan 001 — UTM Desk NoSQL Cloud

Estado: **BORRADOR para aprobación de Kevin** · Responde al CÓMO de `spec.md`.

## 1. Decisiones de tecnología
| Capa | Elección | Por qué (para el PDF de la Fase 1) |
|---|---|---|
| BD | MongoDB Atlas M0 + driver nativo | Obligatorio. El driver deja ver `$jsonSchema`, índices y pipelines sin capa que los oculte. |
| API | Node 20 + Express (JS, ESM) | Un solo lenguaje con la UI, JSON nativo, el ecosistema más usado con MongoDB, despliegue directo en Vercel. |
| Validación | Zod (app) + `$jsonSchema` (Atlas) | Dos líneas de defensa; el error útil llega al usuario y la BD protege aunque falle la app. |
| UI | React + Vite + Tailwind + Recharts | Formularios dinámicos por categoría y gráficas simples; build estático barato. |
| Evidencias | Supabase Storage (bucket privado) | Capa gratuita, URLs firmadas nativas, ya es el stack de Kevin. |
| Contador | Colección `contadores` en Mongo (`$inc` atómico) | El docente aceptó el contador en MongoDB; una dependencia menos y sin cuenta de Redis. |
| Auth | JWT + bcrypt, roles | La precondición "sesión activa validada" de CU-01. |
| Pruebas | Vitest + Supertest (API), Newman/Postman | Postman es entregable; Newman lo corre desde la terminal. |
| Despliegue | Vercel (2 proyectos: `server`, `web`) + GitHub | Flujo habitual de Kevin con `gh` y `vercel` CLI. |

## 2. Arquitectura
```
React (web) ──HTTPS/JSON──▶ Express (interface) ──▶ casos de uso (application)
                                                        │ puertos (interfaces)
                      ┌──────────────┬───────────────┬──┴──────────┐
                  Mongo repos     Contador        Storage        Auth
                  (Atlas)     (Mongo)        (Supabase)    (JWT/bcrypt)
```
Regla de dependencia: `interface → application → domain`; `infrastructure` implementa los puertos que define `application`.

## 3. Estructura de carpetas
```
server/
  src/domain/        # enums, transiciones de estado, esquemas Zod, generarCodigo()
  src/application/   # registrarIncidencia, cargarEvidencia, actualizarEstado, gestionarTags,
                     # buscarIncidencias, analitica, autenticar, puertos/ (interfaces)
  src/infrastructure/# mongo/ (cliente, repos, validador, indices), contador/ (mongo),
                     # storage/supabase, seguridad/ (jwt, bcrypt)
  src/interface/http/# app.js, rutas, controladores, middlewares (auth, roles, errores, rate-limit)
  scripts/           # db-setup.js, db-seed.js, db-export.js, demo-ttl.js
  test/
  api/index.js       # entrada para Vercel
web/src/{pages,components,api,auth,hooks}
postman/             # UTM-Desk.postman_collection.json, UTM-Desk.local.postman_environment.json
entregables/         # script-maestro.js (mongosh), incidencias_campus.json
```

## 4. Modelo de datos

### 4.1 Documento de ejemplo (categoría `computo_redes`)
```json
{
  "_id": { "$oid": "..." },
  "codigo": "INC-2026-0042",
  "consecutivo_diario": 3,
  "titulo": "Switch del laboratorio LC-2 sin respuesta",
  "descripcion": "Desde las 8:00 los equipos del laboratorio no obtienen red.",
  "categoria": "computo_redes",
  "prioridad": "alta",
  "estado": "en proceso",
  "reportante": { "usuario_id": { "$oid": "..." }, "nombre": "Mtra. Ana Pech", "tipo": "docente", "correo": "ana.pech@utmetropolitana.edu.mx" },
  "ubicacion": { "edificio": "Laboratorios de Cómputo", "piso": 1, "espacio": "LC-2" },
  "asignado_a": { "usuario_id": { "$oid": "..." }, "nombre": "Luis Cauich" },
  "detalle_especifico": { "tipo_falla": "switch", "direccion_ip": "10.20.2.1", "vlan": 20, "puerto_uplink": "Gi1/0/24", "equipos_afectados": 28 },
  "tags": ["switch", "sin-red", "laboratorio"],
  "historial_seguimiento": [
    { "fecha": { "$date": "..." }, "autor": { "usuario_id": { "$oid": "..." }, "nombre": "Mtra. Ana Pech" }, "estado_nuevo": "abierta", "comentario": "Incidencia registrada", "horas": 0 },
    { "fecha": { "$date": "..." }, "autor": { "usuario_id": { "$oid": "..." }, "nombre": "Luis Cauich" }, "estado_anterior": "abierta", "estado_nuevo": "en proceso", "comentario": "Revisando uplink", "horas": 1.5 }
  ],
  "evidencias_adjuntas": [
    { "nombre_archivo": "switch-lc2.jpg", "tipo_mime": "image/jpeg", "peso_kb": 412, "storage_path": "INC-2026-0042/switch-lc2.jpg", "url_storage": "https://...firmada", "url_expira": { "$date": "..." }, "fecha_carga": { "$date": "..." } }
  ],
  "horas_invertidas": 1.5,
  "fecha_creacion": { "$date": "..." },
  "fecha_actualizacion": { "$date": "..." }
}
```
`fecha_resolucion` solo aparece en resuelta/cerrada; `asignado_a` se agrega al primer cambio de estado hecho por un técnico (no existe antes: sin `null`).

### 4.2 Variantes de `detalle_especifico`
| Categoría (`categoria`) | Campos obligatorios | Opcionales (solo si aplican) |
|---|---|---|
| `computo_redes` | `tipo_falla` (switch, access_point, servidor, equipo_laboratorio), `direccion_ip` (IPv4), `vlan` (1–4094), `puerto_uplink`, `equipos_afectados` (≥1) | — |
| `infraestructura` | `tipo_dano` (filtracion, luminaria, climatizacion, cerradura, otro), `riesgo_seguridad` (ninguno, bajo, medio, alto), `requiere_contratista` (bool) | `insumos_requeridos` (array de strings, ≥1), `contratista_externo` (string; solo si `requiere_contratista` es true) |
| `academico` | `plataforma` (lms, portal_calificaciones, correo_institucional), `periodo_escolar` (`AAAA-1..3`), `estudiantes_impactados` (≥1) | `codigo_curso` (solo para lms y portal_calificaciones) |

Las reglas "solo si" las valida Zod (el `$jsonSchema` de Mongo no tiene `if/then`).

### 4.3 `$jsonSchema` (esqueleto; `db-setup.js` lo completa)
```js
const validador = { $jsonSchema: {
  bsonType: "object",
  required: ["codigo","consecutivo_diario","titulo","descripcion","categoria","prioridad","estado",
             "reportante","ubicacion","detalle_especifico","tags","historial_seguimiento",
             "evidencias_adjuntas","horas_invertidas","fecha_creacion","fecha_actualizacion"],
  additionalProperties: false,
  properties: {
    _id: { bsonType: "objectId" },
    codigo: { bsonType: "string", pattern: "^INC-\\d{4}-\\d{4,}$" },
    consecutivo_diario: { bsonType: ["int","long"], minimum: 1 },
    titulo: { bsonType: "string", minLength: 5, maxLength: 120 },
    descripcion: { bsonType: "string", minLength: 10, maxLength: 2000 },
    categoria: { enum: ["computo_redes","infraestructura","academico"] },
    prioridad: { enum: ["baja","media","alta","critica"] },
    estado: { enum: ["abierta","en proceso","en espera","resuelta","cerrada"] },
    reportante: { /* usuario_id, nombre, tipo(docente|estudiante|administrativo), correo */ },
    asignado_a: { /* usuario_id, nombre */ },
    ubicacion: { /* edificio, piso (opcional), espacio */ },
    detalle_especifico: { bsonType: "object" },
    tags: { bsonType: "array", uniqueItems: true, items: { bsonType: "string", minLength: 2, maxLength: 40 } },
    historial_seguimiento: { bsonType: "array", minItems: 1, items: { /* fecha, autor, estado_anterior?, estado_nuevo, comentario, horas */ } },
    evidencias_adjuntas: { bsonType: "array", items: { /* nombre_archivo, tipo_mime, peso_kb, storage_path, url_storage, url_expira, fecha_carga */ } },
    horas_invertidas: { bsonType: ["int","double"], minimum: 0 },
    fecha_creacion: { bsonType: "date" }, fecha_actualizacion: { bsonType: "date" },
    fecha_resolucion: { bsonType: "date" }
  },
  allOf: [
    { oneOf: [ // polimorfismo: cada categoría exige SU forma de detalle_especifico
      { properties: { categoria: { enum: ["computo_redes"] },   detalle_especifico: { /* required, additionalProperties:false */ } } },
      { properties: { categoria: { enum: ["infraestructura"] }, detalle_especifico: { /* ... */ } } },
      { properties: { categoria: { enum: ["academico"] },       detalle_especifico: { /* ... */ } } } ] },
    { anyOf: [ // fecha_resolucion obligatoria solo en resuelta/cerrada
      { properties: { estado: { enum: ["abierta","en proceso","en espera"] } } },
      { required: ["fecha_resolucion"], properties: { estado: { enum: ["resuelta","cerrada"] } } } ] }
  ]
}};
// db.createCollection("incidencias_campus", { validator: validador, validationLevel: "strict", validationAction: "error" })
```

### 4.4 Otras colecciones
- `usuarios`: `{ nombre, correo (único), password_hash, rol, tipo? (docente|estudiante|administrativo, solo reportantes), activo }`.
- `contadores` (fallback): `{ _id: "contador:incidencias:2026-10-15:computo_redes", valor }`.

### 4.5 Índices (`db-setup.js`)
| Nombre | Definición | Nota |
|---|---|---|
| `idx_cat_estado_edificio` | `{ categoria:1, estado:1, "ubicacion.edificio":1 }` | Obligatorio; sirve a los filtros de la lista |
| `idx_ttl_resolucion` | `{ fecha_resolucion:1 }`, `expireAfterSeconds: 5184000` | Obligatorio; 60 días |
| `idx_texto_es` | `{ titulo:"text", descripcion:"text" }`, `default_language:"spanish"`, `weights:{ titulo:10, descripcion:5 }` | Obligatorio |
| `idx_codigo` | `{ codigo:1 }` único | Rutas por código |
| `idx_reportante` | `{ "reportante.usuario_id":1, fecha_creacion:-1 }` | "Mis incidencias" |
En `usuarios`: índice único en `correo`.

## 5. Estados y permisos
```
abierta ─▶ en proceso ◀─▶ en espera
   │            │              │
   └────────────┴──────┬───────┘
                       ▼
                   resuelta ──(solo coordinador)──▶ cerrada
```
- Desde `abierta`, `en proceso` o `en espera` se puede ir a cualquiera de los otros dos y a `resuelta`. Nada se reabre. `cerrada` es final.
- `resuelta` y `cerrada` llevan `fecha_resolucion` (si pasa a cerrada, conserva la que ya tenía).

| Acción | reportante | tecnico | coordinador | directivo |
|---|:-:|:-:|:-:|:-:|
| Crear incidencia | ✅ | ✅ | ✅ | ❌ |
| Ver propias / ver todas | propias | todas | todas | todas |
| Subir evidencia | propias | ✅ | ✅ | ❌ |
| Cambiar estado / horas | ❌ | ✅ | ✅ | ❌ |
| Tags | ❌ | ✅ | ✅ | ❌ |
| Cerrar, editar universales, borrar | ❌ | ❌ | ✅ | ❌ |
| Buscar | ✅ (solo propias) | ✅ | ✅ | ✅ |
| Analítica | ❌ | ❌ | ✅ | ✅ |

## 6. Contrato de la API (prefijo `/api`)
Errores siempre `{ "error": { "codigo": "VALIDACION", "mensaje": "...", "detalles": [...] } }`.

| Método y ruta | Rol mínimo | Entrada | Éxito | Errores |
|---|---|---|---|---|
| `GET /health` | público | — | 200 `{ok:true}` | — |
| `POST /auth/login` | público | `{correo, password}` | 200 `{token, usuario}` | 400, 401 |
| `GET /auth/me` | cualquiera | — | 200 `{usuario}` | 401 |
| `POST /incidencias` | reportante+ | universales + `detalle_especifico` | 201 documento | 400, 401, 403 |
| `GET /incidencias` | cualquiera | `?categoria&estado&edificio&prioridad&pagina&limite` | 200 `{datos, total, pagina}` | 401 |
| `GET /incidencias/buscar` | cualquiera | `?q=` | 200 `{datos}` con `score` | 400 |
| `GET /incidencias/:codigo` | cualquiera (dueño o staff) | — | 200 documento | 403, 404 |
| `PATCH /incidencias/:codigo` | coordinador | `titulo, descripcion, prioridad, ubicacion` | 200 | 400, 403, 404 |
| `PATCH /incidencias/:codigo/estado` | tecnico+ | `{estado_nuevo, horas, comentario}` | 200 documento | 400, 403, 404, 409 |
| `POST /incidencias/:codigo/evidencias` | dueño o staff | `multipart` campo `archivo` | 201 evidencia | 400, 403, 404 |
| `POST /incidencias/:codigo/tags` | tecnico+ | `{tag}` | 200 `{tags}` | 400, 403, 404 |
| `DELETE /incidencias/:codigo/tags/:tag` | tecnico+ | — | 200 `{tags}` | 403, 404 |
| `DELETE /incidencias/:codigo` | coordinador | — | 200 | 403, 404 |
| `GET /analitica/edificios` | coordinador, directivo | — | 200 `{datos}` | 403 |
| `GET /analitica/tags` | coordinador, directivo | — | 200 `{datos}` | 403 |

`GET /incidencias/buscar` se registra ANTES que `/:codigo` para que Express no tome "buscar" como código.

## 7. Operaciones MongoDB clave
**Alta (RF-01):** Zod → contador diario + anual → `insertOne`.

**Estado (RF-07):**
```js
const ahora = new Date();
await col.updateOne(
  { codigo, estado: estadoLeido },                       // si cambió → matchedCount 0 → 409
  { $set: { estado: nuevo, fecha_actualizacion: ahora,
            ...(nuevo === "resuelta" ? { fecha_resolucion: ahora } : {}) },
    $push: { historial_seguimiento: { fecha: ahora, autor, estado_anterior: estadoLeido,
                                      estado_nuevo: nuevo, comentario, horas } },
    $inc: { horas_invertidas: horas } });
```
(el `asignado_a` se agrega en el mismo `$set` la primera vez que un técnico actúa y el campo no existe).

**Tags (RF-08):** `updateOne({codigo},{ $addToSet:{tags}, $set:{fecha_actualizacion} })` y `$pull`.
**Evidencia (RF-04):** `updateOne({codigo},{ $push:{evidencias_adjuntas: ev}, $set:{fecha_actualizacion} })`.
**Búsqueda (RF-09):** `find({ $text:{$search:q} }, { projection:{ score:{ $meta:"textScore" } } }).sort({ score:{ $meta:"textScore" } })`.

**Pipeline 1 – eficiencia por edificio:**
```js
[ { $match: { estado: { $in: ["resuelta","cerrada"] }, fecha_resolucion: { $exists: true } } },
  { $addFields: { horas_transcurridas: { $dateDiff: { startDate: "$fecha_creacion", endDate: "$fecha_resolucion", unit: "hour" } } } },
  { $group: { _id: "$ubicacion.edificio", promedio_horas_resolucion: { $avg: "$horas_transcurridas" },
              total_horas_trabajo: { $sum: "$horas_invertidas" }, total_incidencias: { $sum: 1 } } },
  { $sort: { promedio_horas_resolucion: -1 } } ]
```
**Pipeline 2 – top tags:** `[ {$unwind:"$tags"}, {$group:{_id:"$tags", total:{$sum:1}, edificios:{$addToSet:"$ubicacion.edificio"}}}, {$sort:{total:-1,_id:1}}, {$limit:10} ]`.

## 8. Evidencias y contador
- **Evidencias:** `multer` en memoria (límite 4 MB) → validar mime real por firma de bytes (`file-type`) → subir a `evidencias/<codigo>/<uuid>-<nombre>` → URL firmada (`SIGNED_URL_TTL_SECONDS`) → `$push`. Al leer un expediente se regenera `url_storage` desde `storage_path` (la URL guardada solo es una copia temporal).
- **Contador:** puerto `Contador { siguienteDiario(categoria, fecha), siguienteAnual(anio) }` con un solo adaptador Mongo (`findOneAndUpdate` con `$inc`, `upsert` y `returnDocument: "after"` sobre `contadores`, `_id` = `contador:incidencias:YYYY-MM-DD:categoria`). `codigo` = `INC-` + año + `-` + anual con 4 dígitos.

## 9. Datos de demostración (seed)
- **Usuarios** (contraseña desde `SEED_DEFAULT_PASSWORD`): 3 reportantes (docente, estudiante, administrativo), 2 técnicos, 1 coordinador, 1 directivo.
- **24 incidencias**, 8 por categoría. 5 edificios: Edificio A, Edificio B, Laboratorios de Cómputo, Biblioteca, Administrativo.
- Estados: 5 abierta, 4 en proceso, 3 en espera, 6 resuelta, 6 cerrada (12 con `fecha_resolucion`, todas entre 2 y 45 días atrás). Prioridades: 5 baja, 9 media, 7 alta, 3 critica.
- Recurrentes: aula A-203 con 3 filtraciones; Laboratorio LC-2 con 3 fallas de switch/AP; cuentas de correo bloqueadas en 2 periodos.
- ≥17 incidencias con evidencias: el seed sube 4 archivos de muestra (2 png, 1 jpg, 1 pdf) una vez y los referencia con distintas incidencias.
- Tags repetidos a propósito (`switch`, `filtracion`, `lms`, `sin-red`, `urgente`…) para que el top 10 tenga sentido.
- El seed es idempotente: `db:seed` limpia y vuelve a cargar (pide confirmación con `--yes`).
- `scripts/demo-ttl.js` inserta una incidencia con `fecha_resolucion` de hace 61 días (desaparece sola) y otra de hace 59 (se queda) para demostrar CU-07 sin esperar 60 días.

## 10. Interfaz
Pantallas: **Login** · **Incidencias** (tabla/tarjetas, filtros, buscador, "Nueva") · **Nueva incidencia** (campos universales + bloque que cambia por categoría) · **Detalle** (datos, `detalle_especifico`, bitácora tipo línea de tiempo, evidencias con vista previa, etiquetas, panel "Actualizar estado" para staff) · **Analítica** (barras por edificio, tabla de horas, ranking top 10 tags).
Diseño: sobrio, claro, buena legibilidad y colores de estado accesibles; responsivo. Menú según el rol. Se sigue la skill de diseño del frontend al construirla.

## 11. Estrategia de pruebas
- **Unitarias (Vitest):** transiciones de estado, esquemas Zod por categoría, generador de código.
- **Integración (Vitest + Supertest, base `utmdesk_test` en el mismo cluster):** cada RF; test de concurrencia de RF-07; test de `$jsonSchema` (insertar inválido directo a Mongo falla).
- **Postman/Newman:** colección completa con `pm.test` (estado, forma del JSON, variables guardadas como `codigo` y `token`).
- **Revisor:** `explain()` de lista y búsqueda, comprobación de índices con `getIndexes()`, recorrido E2E por rol.

## 12. Despliegue y variables
- Repo en GitHub con `gh` (nombre lo elige Kevin). Dos proyectos Vercel: `server` (con `api/index.js` y `vercel.json` que reescribe `/api/*`) y `web` (`VITE_API_URL`).
- Cliente Mongo cacheado en `globalThis` para serverless.
- Atlas: Network Access `0.0.0.0/0` (Vercel no tiene IP fija) compensado con usuario de BD de solo `readWrite` sobre `utmdesk` y contraseña larga.
- Variables en `.env.example`. Los secretos se cargan en Vercel, nunca en git.

## 13. Casos límite y riesgos
| Riesgo | Mitigación |
|---|---|
| Enunciado contradictorio (3 vs 4 prioridades, código anual vs contador diario) | Decisiones del §1 y de `MEMORY.md`; se justifican en el PDF |
| TTL borra el seed | Fechas recientes + `demo-ttl.js` para la demostración |
| Cold start / conexión a Atlas en Vercel | Cliente cacheado; probar la demo antes de presentar |
| Límite de 4.5 MB de Vercel | Tope de 4 MB y mensaje claro en la UI |
| Cuota M0 de 512 MB y 100 ops/s | Datos pequeños; sin bucles de carga en la demo |
| Internet falla en la defensa | Plan B: API local + Atlas; capturas y video de respaldo |

## 14. Modelo recomendado por tipo de tarea
- **Potente:** B02 (validador/índices), B08 (atomicidad), diseño del contrato de API, R05 (seguridad).
- **Medio:** el resto de backend, UI, pruebas Postman, PDF.
- **Rápido:** scaffolding, exportaciones, formato de documentos, correcciones menores.

## 15. Qué se actualiza al ejecutar
`MEMORY.md` al cerrar cada tarea; `AGENTS.md` si aparece una regla permanente (comandos reales, trampas nuevas); `spec.md` si cambia un requisito (siempre antes que el código).
