# R01 — Revisión del bloque de casos de uso (B05–B12, más B09)

Fecha: 2026-10-15 · Alcance: `server/` (casos de uso, rutas, repositorios, pruebas contra Atlas y Supabase).

## Resultado

- `npm test` en verde (todas las integraciones corren contra Atlas y Supabase reales con colecciones temporales).
- Sin colecciones `*_test_*` ni objetos de prueba residuales en Atlas ni en el bucket.
- `explain()` comprobado: filtro categoría + estado + edificio usa `IXSCAN` en `idx_cat_estado_edificio`; búsqueda usa `TEXT_MATCH`.

## Hallazgos

| # | Severidad | Hallazgo | Estado |
|---|---|---|---|
| 1 | Media | El login respondía más rápido cuando el correo no existía (no hacía bcrypt): permitía adivinar qué correos están registrados midiendo el tiempo. | **Corregido**: siempre se hace una comparación bcrypt (contra un hash de relleno si no hay usuario). Con prueba. |
| 2 | Media | No hay límite de peticiones (RNF-03). El login queda expuesto a fuerza bruta. | Pendiente en **R05**. Requiere agregar `express-rate-limit` (dependencia: pide aprobación). |
| 3 | Media | `src/index.js` arranca con `listen()` y `await` al inicio: no sirve tal cual en Vercel (serverless). | Pendiente en **B16**: exportar la app/handler y cachear el cliente de Mongo en `globalThis`. |
| 4 | Baja | No hay tope de evidencias por incidencia; un usuario podría llenar la cuota de 1 GB de Supabase. | **Decisión de Kevin**: proponer máximo 10 por incidencia (cambio de contrato: nuevo 400). |
| 5 | Baja | Un reportante que abre un código ajeno recibe 403, y uno inexistente 404: los códigos (secuenciales) se pueden enumerar. | Aceptado: así lo manda RF-05. Riesgo bajo, la lista no revela datos. |
| 6 | Baja | `explain()` sin filtros y solo por prioridad usa `COLLSCAN` + `SORT`. | Aceptado con ~24 documentos. Si el volumen creciera, un índice en `fecha_creacion` requiere aprobación (esquema/índices del enunciado). |
| 7 | Info | Técnico y coordinador no tienen `tipo` de reportante y el validador lo exige: se guardan con `reportante.tipo = "administrativo"`. | Decisión documentada en B05. |
| 8 | Info | Atlas M0 da `ECONNRESET` TLS esporádico en corridas largas; la suite corre en serie con timeouts amplios. | Mitigado (`server/vitest.config.js`). |
| 9 | Info | Los JWT (8 h) no se pueden revocar, pero cada petición consulta la BD: un usuario desactivado pierde acceso de inmediato. | Aceptado. |
| 10 | Info | El seed sube un archivo propio por evidencia (no comparte archivos entre incidencias) porque borrar una incidencia (B12) borra sus archivos. | Decisión documentada en B13. |

## Cobertura por requisito (resumen)

| RF | Pruebas |
|---|---|
| RF-01/02/03 | Alta por categoría contra `$jsonSchema` real, consecutivos distintos, 400 cruzado y por campos extra |
| RF-04 | Subida real a Supabase, URL firmada, bucket privado, `.exe` renombrado y >4 MB sin subir nada |
| RF-05/06 | Permisos por rol, filtros, paginación estable, `explain` |
| RF-07 | Concurrencia real (una gana, otra 409), horas e historial correctos |
| RF-08 | `Switch ` y `switch` dejan una sola etiqueta; `$pull` idempotente |
| RF-09 | `filtración` encuentra `filtraciones` y `filtracion`; orden por `score` |
| RF-10 | Números calculados a mano; `$limit 10`; desempate por nombre |
| RF-12 | PATCH y DELETE solo coordinador; borrado de archivos del bucket |
| RF-13 | 401/403 en todas las rutas protegidas |
