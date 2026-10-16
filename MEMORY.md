# MEMORY.md — UTM Desk NoSQL Cloud

Sin datos sensibles aquí (claves, tokens, contraseñas). Máx. ~50 líneas. Actualizar al terminar cada tarea.

## Estado actual
- 2026-10-15: planeación completa en BORRADOR (constitución, spec, plan, tareas). No hay código. Esperando "aprobado" de Kevin para implementar.
- 2026-10-15: D01 hecho: `entregables/Fase1_UTM-Desk-NoSQL-Cloud.pdf` (13 págs, portada UTM, 3 entregables de Fase 1). Falta revisión de Kevin.
- Fase 1 se entrega hoy (2026-10-15). Fase 2 sin fecha confirmada.
- 2026-10-15 T00 parcial: Atlas conecta (Cluster0 reutilizado, usuario `utmdesk_app`, `server/.env` listo). Rol restringido y verificado: `readWrite` solo en `utmdesk` (lectura de otras bases denegada). Supabase: proyecto `utm-desk-nosql-cloud` (org "kevin vargas") con bucket privado `evidencias` (4 MB, jpeg/png/pdf), `SUPABASE_URL` en `.env`. GitHub: repo privado `kevin120509/utm-desk-nosql-cloud`, rama `main` con el commit de planeación. Pendiente: Kevin pega `SUPABASE_SERVICE_ROLE_KEY` en `server/.env` (el `db:ping` de Supabase falla hasta entonces).
- 2026-10-15 T01 hecho: server (Express 5, Vitest 2 tests verdes, `db:ping`) y web (Vite + React + Tailwind v4, build OK). Siguiente: B11 analítica y B12 editar/borrar; B09 evidencias necesita la service key de Supabase; luego R01 y el seed B13.
- 2026-10-15 B08 hecho (directo, el subagente fue bloqueado otra vez): `POST /api/incidencias/:codigo/tags` ($addToSet) y `DELETE .../tags/:tag` ($pull), roles tecnico/coordinador, normalización minúsculas+trim, DELETE idempotente; router propio `rutas/etiquetas.js`.
- 2026-10-15 B10 hecho: `GET /api/incidencias/buscar?q=` (registrada antes de `/:codigo`), `$text` con `textScore`, límite 20, reportante solo las suyas; `explain` usa `TEXT_MATCH`; índice en español encuentra plural y sin acento. 228 tests.
- Trampa de pruebas: archivos de integración en paralelo contra M0 daban fallos intermitentes; `server/vitest.config.js` ahora usa `fileParallelism: false` (~40 s por corrida) y timeouts de 30/60 s.
- El clasificador de permisos bloqueó dos veces el primer subagente de un par paralelo; la tarea se hizo directo en la sesión.
- 2026-10-15 B07 hecho: `PATCH /api/incidencias/:codigo/estado` con un solo `updateOne` (filtro por estado leído → 409 `CONFLICTO`; transición inválida → 400 `TRANSICION_INVALIDA`). `asignado_a` se agrega solo cuando un técnico actúa por primera vez; `fecha_resolucion` solo al pasar a resuelta (cerrar la conserva). Test de concurrencia con barrera en la lectura: una gana, otra 409, horas e historial correctos. 179 tests.
- 2026-10-15 F06 hecho: PanelEstado, PanelEtiquetas, SubirEvidencia (build OK; etiquetas y evidencias esperan B08/B09). El botón de subir evidencia del reportante depende de que `/auth/me` devuelva `id`.
- Trampa de pruebas: las integraciones con Atlas excedían los 5 s de Vitest; `server/vitest.config.js` sube `testTimeout` a 30 s.
- 2026-10-15 B06 hecho (lo implementé directo, el subagente fue bloqueado por el clasificador): `GET /api/incidencias` (filtros categoria/estado/prioridad/edificio, `pagina`, `limite` 1-50, orden `fecha_creacion` desc) y `GET /api/incidencias/:codigo` (403 reportante ajeno, 404 inexistente o código mal formado). `crearApp({auth, incidencias:{registrar,listar,obtener}})`. La lista excluye historial, evidencias y detalle. `explain`: categoría/estado/edificio → SORT>FETCH>IXSCAN; sin filtros y solo prioridad → SORT>COLLSCAN (irrelevante con ~24 docs; no se agregan índices sin preguntar). URLs firmadas se regeneran en B09. 149 tests.
- 2026-10-15 F05 hecho: expediente con detalle por categoría, evidencias, bitácora; 404/403/red con mensajes propios.
- 2026-10-15 B05 hecho: `POST /api/incidencias` (roles reportante/tecnico/coordinador), reportante tomado de la sesión, `codigo` y `consecutivo_diario` con el contador, historial inicial. Decisión: técnico/coordinador sin `tipo` se guardan con `reportante.tipo = "administrativo"`. Error de Atlas (121/11000) → 500 genérico `ERROR_INTERNO`. 115 tests verdes.
- 2026-10-15 F04 hecho: formulario con bloque por categoría; `detalles` del 400 es objeto `{campo: mensaje}` (plan §6 corregido).
- 2026-10-15 B04 hecho: `ContadorMongo` (`$inc`+upsert, claves `contador:incidencias:YYYY-MM-DD:categoria` y `...:anual:AAAA`); el día se calcula en zona America/Merida. 100 tests verdes.
- 2026-10-15 F03 hecho: lista con tabla/tarjetas, filtros y página en la URL, buscador con relevancia (en modo búsqueda se ocultan filtros y paginación porque `/buscar` solo recibe `q`). Sin probar con datos hasta B06/B13.
- 2026-10-15 B01 hecho: dominio en `server/src/domain/` (enums, transiciones, Zod por categoría, `generarCodigo`), 48 tests. Decisiones: transición libre entre abierta/en proceso/en espera (incluye volver a abierta); `transicionValida` devuelve booleano; `piso` entero (puede ser 0 o negativo); `editarIncidencia.ubicacion` exige objeto completo.
- 2026-10-15 B02 hecho: validador `$jsonSchema` strict/error e índices en `incidencias_campus` real (vacía) + `usuarios` con `idx_correo_unico` (sin validador, solo Zod). `npm run db:setup` es idempotente.
- 2026-10-15 B03 hecho: login JWT, `GET /auth/me`, `requiereRol`, manejador de errores `{error:{codigo,mensaje}}`. `usuarioDesdeToken` consulta la BD (usuario desactivado pierde acceso). Dependencias: bcryptjs, jsonwebtoken. Pendiente B-despliegue: exportar la app en vez de `listen` para Vercel. Tests: 89 verdes.
- F02 queda cubierta por F01 (login y guardas ya hechos); se prueba contra el API real tras B13 seed.
- 2026-10-15 F01 hecho: rutas, sesión, cliente API, Layout con menú por rol, placeholders; dependencia `react-router-dom`. La guarda por rol y el login real se prueban cuando exista B03.
- Equipo (4): Arroyo León Luis Diego, Can Domínguez Víctor Emmanuel, Montalvo Canché Emir Emanuel, Vargas Guzmán Kevin Aarón.
- Docente confirmó: contador en MongoDB (sin Redis) y Supabase para evidencias.

## Decisiones (con su porqué)
- Driver nativo `mongodb` y no Mongoose: hay que mostrar `$jsonSchema`, índices y pipelines tal cual.
- Contador: solo colección `contadores` en Mongo (`$inc` atómico, `upsert`). El enunciado menciona INCR de Redis, pero el docente aceptó Mongo (2026-10-15). Sin Upstash.
- Código `INC-AAAA-NNNN` con contador anual; además se hace INCR diario por categoría (clave del enunciado) y se guarda como `consecutivo_diario`. El enunciado mezcla ambos formatos.
- Evidencias: archivo a Supabase Storage; en Mongo se guarda `storage_path` estable + URL firmada temporal (se regenera al leer).
- 4 prioridades, no 3 (el enunciado se contradice).
- Resuelta no se reabre: el TTL cuenta desde `fecha_resolucion`. Cerrada la pone solo el coordinador desde resuelta.
- JavaScript (no TypeScript) para que todo el equipo pueda defender el código.

## Errores a evitar
- Sembrar `fecha_resolucion` de hace más de 60 días: Atlas lo borra en ~1 minuto.
- Campos `null` o vacíos en `detalle_especifico`.
- Subir evidencias de más de 4 MB (límite de Vercel).
- Olvidar Network Access de Atlas para Vercel (0.0.0.0/0 con usuario de BD de mínimo privilegio).

## Próximos pasos
1. Kevin revisa y aprueba spec, plan y tareas (y contesta las dudas de la spec).
2. T00: crear cuentas (Atlas con la cuenta de Kevin, bucket Supabase, repo GitHub).
3. Kevin revisa el PDF de la Fase 1 y confirma acentos de los nombres.
4. Backend y frontend en paralelo; revisor al final de cada bloque.

## Reglas permanentes propuestas para AGENTS.md
(ninguna todavía)
