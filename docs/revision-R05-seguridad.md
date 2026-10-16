# R05 — Revisión de seguridad

Fecha: 2026-10-15 · Alcance: API (`server/`), web (`web/`), base de datos (Atlas), bucket (Supabase) y despliegue (Vercel).

## Resultado

Sin pendientes críticos. Un hallazgo de la revisión R01 (login que revelaba por tiempo si un correo existe) quedó corregido y se agregó
límite de peticiones. Quedan 3 riesgos **aceptados** y documentados (abajo).

## Lista de revisión

| # | Control | Evidencia | Estado |
|---|---|---|---|
| 1 | Secretos fuera de git | `server/.env` y `web/.env*` ignorados; ningún `.env` versionado; búsqueda de URIs de Mongo, `sb_secret_`, JWT y claves en el árbol **y en todo el historial**: solo el marcador de `.env.example` | OK |
| 2 | Secretos en producción | Variables en Vercel; `MONGODB_URI`, `JWT_SECRET` y la secret key de Supabase como *sensibles*; `JWT_SECRET` de producción distinto al local; `SEED_DEFAULT_PASSWORD` no se sube | OK |
| 3 | Permisos por rol en el servidor | Cada ruta usa `requiereRol`; la UI solo oculta. 401 y 403 en la colección de Postman y en pruebas de integración | OK |
| 4 | Reportante solo ve y toca lo suyo | Filtro por propietario puesto por el servidor desde la sesión; 403 en expediente y evidencia ajenos | OK |
| 5 | Contraseñas | bcrypt (costo 10) y comparación constante: se compara siempre contra un hash de relleno si el correo no existe | OK |
| 6 | Sesión | JWT HS256 de 8 h; cada petición consulta la BD: un usuario desactivado pierde acceso de inmediato | OK |
| 7 | Fuerza bruta en login | `express-rate-limit`: 10 intentos **fallidos** por IP cada 15 min (los correctos no cuentan) → 429 con `Retry-After`. Probado en producción | OK |
| 8 | Abuso general | 300 peticiones por IP cada 15 min; `/health` exento | OK |
| 9 | Inyección NoSQL | Todo parámetro, cuerpo y ruta pasa por Zod (`strictObject`, enums, regex del código): `?estado[$ne]=x`, `q[$regex]`, `{ "correo": { "$gt": "" } }` dan 400 sin llegar a la BD. Pruebas automáticas | OK |
| 10 | Validación en dos capas | Zod en la app y `$jsonSchema` estricto en Atlas | OK |
| 11 | Archivos subidos | Tipo REAL por firma de bytes (jpeg, png, pdf), máx. 4 MB, nombre saneado, ruta con UUID; `.exe` renombrado y texto como `.png` dan 400 sin subir nada | OK |
| 12 | Bucket privado | URL pública sin firma falla; URLs firmadas de vida corta, regeneradas al leer; la secret key solo vive en el servidor | OK |
| 13 | Errores sin datos internos | Formato único `{ error: { codigo, mensaje } }`; 500 genérico; JSON roto y cuerpo enorme sin stack ni rutas (prueba automática) | OK |
| 14 | Cabeceras | `helmet`: `nosniff`, HSTS, `X-Frame-Options`; sin `X-Powered-By` | OK |
| 15 | CORS | Solo el origen de la web (`CORS_ORIGIN`); un origen ajeno no recibe su propio origen ni `*` | OK |
| 16 | Dependencias de producción | `npm audit --omit=dev`: 0 vulnerabilidades en `server` y en `web` | OK |
| 17 | XSS en la web | Sin `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `document.write`; React escapa el contenido | OK |
| 18 | Mínimo privilegio en BD | Usuario `utmdesk_app` con `readWrite` solo sobre `utmdesk`; lectura de otras bases denegada (verificado) | OK |
| 19 | Cuerpo de la petición | `express.json` limitado a 100 KB; multipart a 1 archivo de 4 MB | OK |
| 20 | Datos de demostración | Contraseña única de demo en `.env`; el entregable de BD no incluye usuarios ni hashes ni tokens de URLs firmadas | OK |

## Riesgos aceptados

1. **Red de Atlas abierta (`0.0.0.0/0`).** Vercel no tiene IP fija. Se compensa con usuario de BD de mínimo privilegio, TLS obligatorio y
   contraseña larga generada. Para producción real: Vercel Secure Compute o *private link* con IP fija.
2. **El límite de peticiones es por instancia.** En serverless pueden coexistir varias instancias, así que el tope no es global exacto. Frena
   a un atacante simple; para un tope global habría que guardar los contadores en MongoDB.
3. **El token de sesión vive en `localStorage`.** Un XSS futuro podría leerlo. Mitigado: no se renderiza HTML sin escapar y el token caduca
   en 8 h. Alternativa: cookie `HttpOnly` + protección CSRF (cambia el contrato).

## Mejoras opcionales (no bloquean la entrega)

- Tope de evidencias por incidencia (p. ej. 10): evita llenar la cuota de 1 GB de Supabase.
- Rotar `JWT_SECRET` y la secret key de Supabase después de la defensa.
- Bloqueo por cuenta (no solo por IP) tras N fallos.
