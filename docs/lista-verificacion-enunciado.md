# Lista de verificación contra el enunciado (RF → evidencia)

Fecha: 2026-10-16 · Fuente: `docs/enunciado.pdf` vía `specs/001-utm-desk/spec.md` §4–§7.
Leyenda: ✅ verificado con evidencia · ⏳ falta verificar · ➖ fuera de alcance.

## Requisitos funcionales

| RF | Qué pide | Evidencia | Estado |
|---|---|---|---|
| RF-01 Alta | POST válido crea incidencia con código, estado abierta, bitácora inicial | Pruebas de integración (Atlas real), Newman 201, UI: se crearon INC-2026-0030/31/32 (una por categoría) | ✅ |
| RF-02 Validación | 400 con errores; Mongo como segunda defensa | Pruebas Zod + `$jsonSchema` real; UI muestra error junto a cada campo y lo quita al corregir | ✅ |
| RF-03 Contador | `$inc` atómico, 20 llamadas paralelas distintas | Prueba B04; códigos consecutivos 0030→0032 desde la UI | ✅ |
| RF-04 Evidencia | jpeg/png/pdf ≤ 4 MB, URL firmada, `$push`; 400 sin subir si inválido | Integración + UI: PNG y PDF subidos y visibles; `.png` de texto, 4 MB + 1 byte y 0 bytes rechazados en la UI | ✅ |
| RF-05 Expediente | Lectura única, URLs regeneradas, 403 ajeno | UI: Ana ve la suya; 0002 y 0004 muestran "No tienes permiso"; 0999 muestra "no existe o ya fue depurada" | ✅ |
| RF-06 Lista/filtros | Filtros + paginación + `IXSCAN` | Integración (`explain`), UI: filtros categoría/prioridad/edificio, limpiar filtros, estado vacío | ✅ |
| RF-07 Estado atómico | 200 y 409 con dos PATCH simultáneos | Prueba de concurrencia contra Atlas | ✅ (UI del técnico ⏳) |
| RF-08 Etiquetas | `$addToSet` sin duplicar, `$pull` | Integración (Switch/switch una sola) | ✅ (UI ⏳) |
| RF-09 Búsqueda | `$text` español, score, orden | UI: "filtración aula" devuelve resultados con Relevancia; integración con `TEXT_MATCH` | ✅ |
| RF-10 Analítica | Dos pipelines | Integración contra cálculo a mano; Newman | ✅ (UI directivo ⏳) |
| RF-11 TTL 60 días | 61 d desaparece, 59 d permanece | `npm run demo:ttl` (purga en ~10 s) | ✅ |
| RF-12 Editar/borrar | PATCH y DELETE coordinador, 403 técnico | Integración + Newman; UI `PanelAdministrar` construido | ✅ API · ⏳ UI coordinador |
| RF-13 Sesión/permisos | 200 / 401 / 403 | Newman; límite de intentos de login probado en producción | ✅ |
| RF-14 Datos demo | Seed 24 incidencias; export JSON y script maestro | `db:seed`, `db:verify` 16/16, `db:export`; script maestro corrido en base vacía de Atlas | ✅ (script maestro corrido con mongosh 2.13.0 real el 2026-10-19: 24 docs, 5 índices y validador activo) |
| RF-15 Interfaz | Login, formulario dinámico, lista, expediente, estado, analítica | Recorrido UI con los 4 roles hecho el 2026-10-16 | ✅ |

## No funcionales

| RNF | Evidencia | Estado |
|---|---|---|
| RNF-01 Rendimiento | `explain()` con `IXSCAN` y `TEXT` en pruebas | ✅ (capturas R04 ⏳) |
| RNF-02 Almacenamiento | Binarios solo en Supabase; Mongo guarda metadatos | ✅ |
| RNF-03 Seguridad | `docs/revision-R05-seguridad.md` (20 controles) | ✅ |
| RNF-04 Integridad | Dos capas de validación; PATCH atómico con 409 | ✅ |
| RNF-05 Disponibilidad | API y web en Vercel; Newman 125/125 contra producción | ✅ |
| RNF-06 Usabilidad | UI en español, vacíos y errores claros; móvil ⏳ re-verificar tras últimos cambios | ⏳ parcial |
| RNF-07 Mantenibilidad | 351 pruebas, arquitectura limpia, `docs/` | ✅ |
| RNF-08 Entrega | Postman exportado, script maestro; PDF final y zip ⏳ (D06) | ⏳ |

## Casos límite (spec §6)

| # | Caso | Estado |
|---|---|---|
| 1 | Dos técnicos a la vez → 409 | ✅ integración |
| 2 | `detalle_especifico` cruzado → 400 | ✅ |
| 3 | Etiqueta repetida con otro formato | ✅ |
| 4 | 0 bytes, > 4 MB, `.exe` renombrado | ✅ API y UI |
| 5 | Cambio de estado en cerrada/resuelta → 400 | ✅ |
| 6 | Horas negativas o > 24 → 400 | ✅ |
| 7 | Búsqueda con acentos y plurales | ✅ |
| 8 | 404 en enlace depurado | ✅ UI |
| 9 | URL firmada caducada se regenera | ✅ |
| 10 | Redis caído | ➖ no se usa Redis |
| 11 | Hueco en numeración | ✅ documentado |
| 12 | Vacíos sin pantallas rotas | ✅ UI |

## Pendiente de la entrega

- Probar en la UI con los otros tres roles (técnico, coordinador, directivo): requiere iniciar sesión con la contraseña del seed.
- R04 capturas de Atlas, R06 informe E2E, D03 capturas, D04 guía de defensa, D05 guion de demo, D06 PDF final y zip.
- (hecho) `mongosh` real sobre el script maestro.
- Restablecer la base con datos de ejemplo al terminar las pruebas (`npm run db:seed -- --yes`).
