# MEMORY.md — UTM Desk NoSQL Cloud

Sin datos sensibles aquí (claves, tokens, contraseñas). Máx. ~50 líneas. Actualizar al terminar cada tarea.

## Estado actual
- 2026-10-15: planeación completa en BORRADOR (constitución, spec, plan, tareas). No hay código. Esperando "aprobado" de Kevin para implementar.
- 2026-10-15: D01 hecho: `entregables/Fase1_UTM-Desk-NoSQL-Cloud.pdf` (13 págs, portada UTM, 3 entregables de Fase 1). Falta revisión de Kevin.
- Fase 1 se entrega hoy (2026-10-15). Fase 2 sin fecha confirmada.
- 2026-10-15 T00 parcial: Atlas conecta (Cluster0 reutilizado, usuario `utmdesk_app`, `server/.env` listo). Rol restringido y verificado: `readWrite` solo en `utmdesk` (lectura de otras bases denegada). Supabase: proyecto `utm-desk-nosql-cloud` (org "kevin vargas") con bucket privado `evidencias` (4 MB, jpeg/png/pdf), `SUPABASE_URL` en `.env`. GitHub: repo privado `kevin120509/utm-desk-nosql-cloud`, rama `main` con el commit de planeación. Pendiente: Kevin pega `SUPABASE_SERVICE_ROLE_KEY` en `server/.env` (el `db:ping` de Supabase falla hasta entonces).
- 2026-10-15 T01 hecho: server (Express 5, Vitest 2 tests verdes, `db:ping`) y web (Vite + React + Tailwind v4, build OK). Siguiente: B02 validador/índices; en paralelo F02 login y guardas.
- 2026-10-15 B01 hecho: dominio en `server/src/domain/` (enums, transiciones, Zod por categoría, `generarCodigo`), 48 tests. Decisiones: transición libre entre abierta/en proceso/en espera (incluye volver a abierta); `transicionValida` devuelve booleano; `piso` entero (puede ser 0 o negativo); `editarIncidencia.ubicacion` exige objeto completo.
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
