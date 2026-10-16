# Tareas 001 — UTM Desk NoSQL Cloud

Estado: **BORRADOR para aprobación de Kevin**. Cada tarea ≈ 20–30 min; si se alarga, se divide. Una a la vez, prueba primero. Al cerrar cada una: marcar `[x]` y actualizar `MEMORY.md`.

Carriles: **[K]** Kevin/equipo (manual) · **[B]** backend · **[F]** frontend · **[R]** revisor · **[D]** documentos.
Paralelismo: tras T01, **[B]** y **[F]** avanzan a la vez (el contrato está en `plan.md` §6). El **[R]** entra al final de cada bloque. **D01 va primero**: la Fase 1 es la primera entrega.

## Hito 0 — Preparación
- [x] **T00 [K] Cuentas y servicios.** (hecho 2026-10-15; falta solo que Kevin pegue `SUPABASE_SERVICE_ROLE_KEY` en `server/.env`; `db:ping` se prueba en T01) Crear cluster Atlas M0 + usuario de BD (`readWrite` en `utmdesk`) + Network Access; bucket privado `evidencias` en Supabase; repo en GitHub. Llenar `server/.env`. (Sin Redis: el contador va en Mongo.) *Hecho cuando:* `npm run db:ping` conecta a Atlas y Supabase (se crea en T01).
- [x] **T01 [B] Esqueleto.** (hecho 2026-10-15: health 200 por Supertest, web compila, `db:ping` OK en Atlas; Supabase queda OK al pegar la service key) `git init`, estructura de carpetas, `package.json` de `server` y `web`, Express con `GET /api/health`, Vite arrancando, script `db:ping`. *Hecho cuando:* `/api/health` responde 200, la web abre y `db:ping` imprime OK en los tres servicios.

## Hito 1 — Documento Fase 1 (puede empezar ya)
- [x] **D01 [D] PDF Fase 1 (APA 7).** (hecho 2026-10-15: `entregables/Fase1_UTM-Desk-NoSQL-Cloud.pdf`, pendiente revisión de Kevin) Portada UTM con nombre completo, selección justificada de tecnologías, RF/RNF (de la spec), modelo JSON/BSON con un ejemplo por categoría y el `$jsonSchema`, referencias. *Hecho cuando:* PDF generado, revisado y guardado en `entregables/`.
- [ ] **D02 [D] Guion de la presentación de Fase 1.** Una página con los puntos a explicar al docente y las decisiones que defender (3 vs 4 prioridades, contador, evidencias). *Hecho cuando:* cada integrante puede explicar sus puntos.

## Hito 2 — Base de datos y dominio [B]
- [x] **B01 Dominio.** (hecho 2026-10-15: 48 tests verdes) Enums, transiciones de estado, esquemas Zod por categoría, `generarCodigo`. *Hecho cuando:* tests unitarios de los 3 `detalle_especifico` (válido e inválido) y de las transiciones pasan.
- [x] **B02 Validador e índices.** (hecho 2026-10-15: 18 tests contra Atlas; `db:setup` ejecutado en `utmdesk`) `db-setup.js` con `$jsonSchema` completo y los índices del plan §4.5; cliente Mongo cacheado. *Hecho cuando:* insertar un documento válido pasa y uno con `detalle_especifico` de otra categoría falla; `getIndexes()` lista los 5.
- [x] **B03 Usuarios y auth.** (hecho 2026-10-15; sin usuarios reales hasta B13 seed) Colección `usuarios`, login, JWT, middleware de roles, `GET /auth/me`. *Hecho cuando:* 200 con credenciales buenas, 401 sin/mal token, 403 con rol sin permiso.
- [x] **B04 Contador.** (hecho 2026-10-15: 100 tests; 20 paralelos distintos) Puerto + adaptador Mongo (`$inc` atómico con `upsert`). *Hecho cuando:* 20 llamadas en paralelo devuelven 20 números distintos.

## Hito 3 — Casos de uso [B] (en este orden)
- [x] **B05 RF-01/02/03 Alta.** (hecho 2026-10-15: 115 tests; una incidencia por categoría pasa el `$jsonSchema` real) `POST /incidencias`. *Hecho cuando:* 201 con `codigo` y `consecutivo_diario`; 400 con `detalle_especifico` cruzado; el documento se ve en Atlas.
- [x] **B06 RF-05/06 Lectura.** (hecho 2026-10-15: 149 tests; explain con IXSCAN para categoría/estado/edificio) `GET /incidencias` con filtros y paginación, `GET /incidencias/:codigo`. *Hecho cuando:* filtros funcionan, reportante solo ve las suyas, `explain()` muestra `IXSCAN`.
- [x] **B07 RF-07 Estado atómico.** (hecho 2026-10-15: 179 tests; concurrencia real contra Atlas: una gana y otra recibe 409) `PATCH /:codigo/estado` con filtro por estado leído y 409. *Hecho cuando:* test con dos PATCH simultáneos da 200 y 409; horas y bitácora quedan correctas; `fecha_resolucion` solo en resuelta.
- [x] **B08 RF-08 Etiquetas.** (hecho 2026-10-15: 24 tests; Switch/switch no duplica) `$addToSet` y `$pull`. *Hecho cuando:* repetir la misma etiqueta (con otro formato) no duplica; DELETE la quita.
- [x] **B09 RF-04 Evidencias.** (hecho 2026-10-15: 307 tests; subida real a Supabase con URL firmada; `.exe` renombrado y >4 MB dan 400 sin subir nada) Subida a Supabase, validación de mime real y tamaño, URL firmada, `$push`. *Hecho cuando:* archivo válido → 201 y visible en el bucket; `.exe` renombrado o > 4 MB → 400 sin subir.
- [x] **B10 RF-09 Búsqueda.** (hecho 2026-10-15: "filtración" encuentra "filtraciones"; explain con TEXT_MATCH) `GET /incidencias/buscar`. *Hecho cuando:* "filtración" encuentra "filtraciones", ordenado por `score`, `explain()` con etapa `TEXT`.
- [x] **B11 RF-10 Analítica.** (hecho 2026-10-15: pipelines contra números calculados a mano en Atlas; la comparación con el seed queda en B13) Los dos pipelines y sus rutas. *Hecho cuando:* los números coinciden con el cálculo a mano del seed.
- [x] **B12 RF-12 Editar y borrar.** (hecho 2026-10-15: 267 tests; el borrado de archivos del bucket usa `AlmacenNulo` hasta B09) `PATCH /:codigo` y `DELETE /:codigo` (borra también los archivos del bucket). *Hecho cuando:* 200 en ambos y 403 para técnico.
- [x] **R01 [R] Revisión del bloque de casos de uso.** (hecho 2026-10-15: `docs/revision-R01.md`; 322 tests; 1 hallazgo corregido, 2 pendientes para R05/B16) Pruebas de integración de B05–B12 contra Atlas (base de pruebas). *Hecho cuando:* `npm test` verde y lista de hallazgos entregada al backend.

## Hito 4 — Datos y TTL [B]
- [ ] **B13 Seed.** (script `db:seed` y `db:verify` escritos y probados con `--dry-run` y contra el `$jsonSchema` real; FALTA ejecutar `npm run db:seed -- --yes` con "aprobado" de Kevin) `db-seed.js` con usuarios, archivos de muestra en el bucket y 24 incidencias (plan §9). *Hecho cuando:* conteos por categoría, estado, prioridad, edificios, resueltas (≥8) y con evidencias (≥15) cumplen el enunciado (script de verificación incluido).
- [ ] **B14 RF-11 TTL.** `demo-ttl.js` (61 días vs 59 días). *Hecho cuando:* el de 61 días desaparece en ≤ 2 min y el de 59 permanece.
- [ ] **B15 Entregables de BD.** `db-export.js` genera `entregables/incidencias_campus.json` y `entregables/script-maestro.js` (mongosh: validador, índices, inserts). *Hecho cuando:* el script maestro corre en una base vacía y reproduce lo mismo.

## Hito 5 — Frontend [F] (en paralelo con Hitos 2–4)
- [x] **F01 Base.** (hecho 2026-10-15: build OK; guarda por rol sin probar hasta B03) Tailwind, router, cliente `api`, contexto de sesión, layout con menú por rol. *Hecho cuando:* navega entre páginas vacías.
- [ ] **F02 Login y guardas.** Pantalla de login y rutas protegidas por rol. *Hecho cuando:* cada rol ve solo su menú; 401 lleva al login.
- [x] **F03 Lista.** (hecho 2026-10-15: build OK; se prueba con datos reales tras B06 y B13) Tabla/tarjetas, filtros, paginación, buscador con relevancia. *Hecho cuando:* filtrar y buscar cambia resultados reales.
- [x] **F04 Nueva incidencia.** (hecho 2026-10-15: build OK; se prueba E2E con usuarios del seed B13) Formulario con bloque dinámico por categoría y errores del 400 junto a cada campo. *Hecho cuando:* se crea una incidencia de cada categoría desde la UI.
- [x] **F05 Detalle.** (hecho 2026-10-15: build OK; contenedor `panel-acciones-personal` listo para F06) Datos, `detalle_especifico`, bitácora en línea de tiempo. *Hecho cuando:* se ve el expediente completo en una sola carga.
- [x] **F06 Acciones de staff.** (hecho 2026-10-15: build OK; etiquetas y evidencia dependen de B08/B09) Actualizar estado/horas/comentario, etiquetas, subir evidencia con vista previa; manejo del 409. *Hecho cuando:* una actualización se refleja en la bitácora sin recargar.
- [x] **F07 Analítica.** (hecho 2026-10-15: build OK, página cargada bajo demanda; verificación visual con datos tras B13) Barras por edificio, tabla de horas, top 10 tags. *Hecho cuando:* coincide con `GET /analitica/*`.
- [ ] **F08 Pulido.** Estados vacíos, cargando, errores, responsivo, foco y contraste. *Hecho cuando:* recorrido en móvil sin scroll horizontal.

## Hito 6 — Integración y calidad [R]
- [ ] **R02 [R] Colección Postman.** Carpeta por caso de uso, variables `token` y `codigo`, `pm.test` en cada petición; incluye POST 201, GET 200, PATCH 200, POST 400, 401, 403, 404, 409. *Hecho cuando:* exportada a `postman/`.
- [ ] **R03 [R] Newman.** `npm run test:api` corre la colección completa. *Hecho cuando:* todo en verde contra el servidor desplegado.
- [ ] **R04 [R] Verificación en Atlas.** `getIndexes()`, `explain()` (lista y búsqueda), validador activo, CRUD visto en Atlas. *Hecho cuando:* capturas guardadas en `docs/capturas/`.
- [ ] **R05 [R] Seguridad.** Revisar: secretos fuera de git, roles en servidor, rate-limit, `helmet`, mime real, bucket privado, mensajes de error sin datos internos. *Hecho cuando:* lista de revisión sin pendientes críticos.
- [ ] **R06 [R] Recorrido E2E por rol.** UI ↔ API ↔ Atlas con los 4 roles. *Hecho cuando:* informe final del revisor (qué probó, qué falló, qué se corrigió).

## Hito 7 — Despliegue
- [ ] **B16 [B] API en Vercel.** `api/index.js`, `vercel.json`, variables de entorno. *Hecho cuando:* `/api/health` y un login real responden en la URL pública.
- [ ] **F09 [F] Web en Vercel.** *Hecho cuando:* la URL pública entra, inicia sesión y lista incidencias del Atlas real.

## Hito 8 — Documentos finales
- [ ] **D03 [D] Capturas.** Atlas (documentos, índices, validador), UI por pantalla, Postman (URL, método, cabeceras, status y payload). *Hecho cuando:* imágenes nítidas en `docs/capturas/`.
- [ ] **D04 [D] Guía de defensa individual.** Preguntas probables por caso de uso y respuesta corta con el código involucrado. *Hecho cuando:* cada integrante tiene sus caso(s) de uso asignados y las respuestas.
- [ ] **D05 [D] Guion de la demo en vivo.** Orden: Atlas → UI (alta) → evidencia → estado → tags → búsqueda → analítica → TTL → Postman → plan B. *Hecho cuando:* ensayo completo en menos de 10 min.
- [ ] **D06 [D] PDF final (APA 7) y zip.** Portada, problemática, justificación, requisitos finales, tecnologías, capturas, esquema JSON poblado, banco de pruebas Postman, conclusiones individuales, referencias; `.zip` con PDF, script maestro/JSON y enlaces del repo y URL. *Hecho cuando:* `.zip` revisado contra la lista del enunciado §6 Fase 2.

## Validación final (RF por RF)
- [ ] Revisar la tabla de `spec.md` §7 marcando la evidencia de cada RF. Reportar a Kevin las decisiones tomadas por cuenta propia.
