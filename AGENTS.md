# AGENTS.md — UTM Desk NoSQL Cloud

Proyecto escolar en equipo (UTM, Bases de Datos en la Nube, Unidad II): sistema de incidencias del campus sobre MongoDB Atlas. Fase 1 = PDF de avance; Fase 2 = zip final + defensa en vivo. Enunciado: `docs/enunciado.pdf`.

## Stack y estructura
- BD: MongoDB Atlas M0, driver nativo `mongodb` (SIN Mongoose). Colecciones: `incidencias_campus`, `usuarios`, `contadores` (contador diario y anual, `$inc` atómico; sin Redis por decisión del docente).
- Evidencias: Supabase Storage, bucket privado `evidencias`, URLs firmadas.
- `server/` Node 20+, Express, JavaScript ESM. Arquitectura limpia: `src/domain` → `src/application` → `src/infrastructure` / `src/interface`.
- `web/` React + Vite + Tailwind. `postman/` colección + environment. `entregables/` script maestro y JSON exportado. `specs/001-utm-desk/` spec, plan y tareas.

## Comandos exactos
- `cd server && npm run dev` (puerto 4000) · `npm test` · `npm run db:setup` · `npm run db:seed` · `npm run db:export` · `npm run test:api` (Newman)
- `cd web && npm run dev` (puerto 5173) · `npm run build`

## Convenciones
- Campos de BD EXACTOS como el enunciado: snake_case sin acentos (`fecha_resolucion`, `detalle_especifico`, `historial_seguimiento`).
- Dominio en español, términos técnicos en inglés. Código simple y comentado: cada integrante debe poder defenderlo.
- Errores de la API: `{ error: { codigo, mensaje, detalles? } }`. 201/200/400/401/403/404/409.

## Reglas de dominio y trampas
- 4 prioridades (baja, media, alta, critica) aunque el enunciado diga "3". 5 estados.
- NUNCA campos `null` ni vacíos de relleno: el campo opcional simplemente no existe.
- `fecha_resolucion` es `Date` y solo existe en resuelta/cerrada. El TTL (60 días) borra solo: las fechas del seed deben ser recientes.
- Solo puede haber UN índice de texto por colección. El índice compuesto y el de texto son los del enunciado.
- Números en `$jsonSchema`: usar `bsonType: ["int","double"]`, no solo `int`.
- Vercel limita el body a 4.5 MB: evidencias de máximo 4 MB (jpeg/png/pdf).
- Estado se cambia con UN `updateOne` atómico (`$set` + `$push` + `$inc`) con el estado anterior en el filtro.

## Forma de trabajo
- Leer `MEMORY.md` al empezar y actualizarlo al terminar cada tarea. SDD: no pasar de fase sin aprobación de Kevin.
- Una tarea a la vez, prueba primero. Roles: backend, frontend y revisor (integración, GET/POST/PATCH/DELETE contra Atlas).
- Subagentes solo los necesarios, con el contexto ya reunido, en paralelo si no dependen; un solo resumen final.

## Límites
- ✅ Siempre: tests, validar con `$jsonSchema` + Zod, `.env` fuera de git, reportar decisiones propias al terminar.
- ⚠️ Preguntar antes: cambiar enums o esquema, agregar dependencias, cambiar el contrato de la API, tocar cuentas cloud.
- 🚫 Nunca: commitear claves, usar Mongoose, `null` de relleno, `db:reset` sin avisar, saltar fases SDD.

## Verificación
`npm test` en server, `npm run test:api` con Newman, `explain()` de búsqueda y filtros, recorrido manual por rol en la UI.
