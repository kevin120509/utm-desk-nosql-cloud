# Prompt inicial para Claude Code

Abre una terminal en esta carpeta, ejecuta `claude` y pega el bloque de abajo.

---

**Contexto y fuentes.** Este es el proyecto escolar UTM Desk NoSQL Cloud (Bases de Datos en la Nube, Unidad II, en equipo). Lee en este orden: `AGENTS.md`, `MEMORY.md`, `docs/constitution.md`, `specs/001-utm-desk/spec.md`, `plan.md`, `tasks.md`. El enunciado original está en `docs/enunciado.pdf`.

**Objetivo.** Implementar el sistema completo siguiendo `tasks.md` en orden: base de datos y casos de uso en MongoDB Atlas, API Express, UI React, colección Postman, despliegue en Vercel, y los documentos finales.

**Entregables.** Código en `server/` y `web/`; `postman/`; `entregables/` (script maestro y JSON exportado); documentos en `docs/` y los PDF de las dos fases en APA 7; repositorio en GitHub y despliegue en Vercel con `gh` y `vercel` CLI. Antes de programar, dime qué necesitas de T00 (cuentas) y espera mi "aprobado".

**Límites de autonomía.**
- Una tarea a la vez, prueba primero. Al terminar cada una, marca `[x]` en `tasks.md` y actualiza `MEMORY.md`.
- Trabaja con roles dentro de la sesión: backend, frontend y revisor. Usa solo los subagentes necesarios, pásales el contexto ya leído, corre en paralelo los que no dependan entre sí y dame un solo resumen consolidado.
- Pregúntame antes de: cambiar enums o esquema, agregar dependencias, cambiar el contrato de la API, crear o modificar cuentas cloud, correr `db:seed --yes` o cualquier cosa que borre datos.
- Nunca subas claves ni `.env` a git. No uses Mongoose. No dejes campos `null`.
- Si algo del enunciado contradice la spec, para y pregúntame.

**Definición de completado.** Todas las casillas de `tasks.md` marcadas; la tabla de `spec.md` §7 con evidencia por RF; `npm test` y `npm run test:api` en verde contra la nube; demo en vivo ensayada. Al final dame un reporte corto con las decisiones que tomaste por tu cuenta para que las revise.
