# Colección de Postman — UTM Desk NoSQL Cloud

Banco de pruebas de la API: 10 carpetas (una por caso de uso), 62 peticiones y 125 pruebas (`pm.test`).
Cubre POST 201, GET 200, PATCH 200, 400 de validación, 401, 403, 404 y la concurrencia del cambio de estado.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `UTM-Desk.postman_collection.json` | La colección (importar en Postman). |
| `UTM-Desk.local.postman_environment.json` | Variables: `base_url`, correos de las cuentas demo y `password` (vacía a propósito). |
| `fixtures/evidencia.png` | Imagen real que sube la carpeta 5. |
| `fixtures/no-es-imagen.png` | Texto con extensión `.png`: debe rechazarse (400). |

## En Postman

1. Importa la colección y el environment.
2. En el environment escribe `password` (la `SEED_DEFAULT_PASSWORD` de `server/.env`) y ajusta `base_url`
   (`http://localhost:4000/api` o la URL desplegada terminada en `/api`).
3. En **Settings → General → Working directory** apunta a esta carpeta `postman/` para que encuentre `fixtures/`.
4. Ejecuta **Run collection** en orden: las carpetas dependen de `codigo` y de los tokens que guardan las primeras.

## Con Newman (terminal)

```bash
cd server
npm run test:api                                         # arranca la API local y la prueba
API_URL=https://<tu-api>.vercel.app/api npm run test:api # prueba la API desplegada
```

Necesita los datos del seed (`npm run db:seed -- --yes`). La colección crea una incidencia, le agrega etiqueta y
evidencia, la cierra y la **borra al final**, así que la base queda como estaba (solo avanza el contador).
El reporte JSON se guarda en `postman/resultados/` (no se versiona).

## Regenerar

La colección se genera por código: `cd server && npm run postman:build`
(fuente: `server/scripts/postman/construirColeccion.js`).
