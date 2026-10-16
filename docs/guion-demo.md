# Guion de la demo en vivo (D05) — menos de 10 minutos

URLs: web https://utm-desk-web.vercel.app · API https://utm-desk-api.vercel.app/api/health
Cuentas de demo: correos en `server/scripts/seed/datos.js`; la contraseña es `SEED_DEFAULT_PASSWORD` de `server/.env` (no se escribe en documentos).
Antes de empezar: base restablecida con `npm run db:seed -- --yes` y `npm run db:verify` en verde; una pestaña con Atlas (Browse Collections), una con la web, Postman abierto con la colección y el entorno de producción.

| Min | Paso | Qué se muestra | Quién |
|---|---|---|---|
| 0:00 | Contexto | Problema y modelo documental en una frase; 24 documentos, 3 categorías | Kevin |
| 0:45 | Atlas | Colección `incidencias_campus`: un documento por categoría (`detalle_especifico` distinto), pestaña Indexes (los 5), validador | Kevin |
| 2:00 | Alta (reportante Ana) | Nueva incidencia: el formulario cambia con la categoría; enviar con un campo mal para ver el error junto al campo; corregir y crear. Mostrar el código `INC-AAAA-NNNN` | Kevin |
| 3:00 | Evidencia | Subir un PNG o PDF; mostrar que `.png` falso o > 4 MB se rechaza; en Atlas ver el `$push` en `evidencias_adjuntas` | Víctor |
| 4:00 | Estado (técnico Luis) | Cambiar a "en proceso" con horas y comentario; la bitácora se actualiza; horas > 24 dan error | Luis Diego |
| 4:45 | Etiquetas | Agregar `Switch ` y `switch`: queda una; quitar una | Víctor |
| 5:30 | Búsqueda | Buscar "filtración": aparece "filtraciones" con relevancia; en Atlas o Postman mostrar `explain()` con `TEXT_MATCH` | Emir |
| 6:30 | Analítica (coordinador Roberto) | Eficiencia por edificio y top etiquetas; Panel Administrar: editar y cerrar | Emir |
| 7:30 | TTL | `npm run demo:ttl`: el documento de 61 días desaparece, el de 59 permanece | Emir |
| 8:30 | Postman | Ejecutar la colección (o `npm run test:api`): 125 pruebas en verde contra producción; señalar 201, 400, 401, 403, 404 | Luis Diego |
| 9:30 | Cierre | Arquitectura limpia, seguridad (R05) y despliegue en Vercel | Kevin |

## Plan B

- **La web no carga o Vercel falla:** correr local (`npm --prefix server run start` y `npm --prefix web run dev`) apuntando al mismo Atlas.
- **Atlas lento o sin red:** mostrar `entregables/incidencias_campus.json` y las capturas de `docs/capturas/`.
- **El TTL tarda:** el monitor corre cada ~60 s; dejar corriendo el script y volver al final, o mostrar la captura previa.
- **Cuenta bloqueada por el límite de intentos de login:** esperar 15 minutos o usar otra IP; ensayar sin fallar la contraseña.
- **Subida de archivo falla:** tener un PNG y un PDF de prueba pequeños en el escritorio.

## Ensayo

Cronometrar el recorrido completo una vez antes de la entrega; si pasa de 10 minutos, quitar el paso de etiquetas y resumir la analítica.
