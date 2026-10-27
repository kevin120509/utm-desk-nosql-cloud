Trabaja únicamente en la carpeta `web` del repositorio `utm-desk-nosql-cloud`. No modifiques `server`, MongoDB, Supabase ni las credenciales.

La API backend ya está desplegada y responde correctamente en:

`https://utm-desk-nosql-cloud-server-three.vercel.app/api`

Revisa y corrige el frontend para que funcione con esa API.

Tareas:

1. Revisa `web/src/api/cliente.js`, `web/src/auth/` y las páginas que utilizan la API.
2. Confirma que todas las peticiones usen:

```js
import.meta.env.VITE_API_URL || "http://localhost:4000/api"
```

3. Confirma que el login utilice:

```http
POST /auth/login
```

con este cuerpo:

```json
{
  "correo": "...",
  "password": "..."
}
```

4. Confirma que las rutas protegidas envíen el token como:

```http
Authorization: Bearer TOKEN
```

5. Crea o actualiza `web/.env.example` con:

```env
VITE_API_URL=http://localhost:4000/api
```

6. No guardes secretos ni contraseñas en el frontend.
7. No hardcodees la URL de producción dentro de los componentes. La URL debe provenir de `VITE_API_URL`.
8. Revisa que `web/vercel.json` sea compatible con un proyecto cuyo `Root Directory` sea `web`.
9. Ejecuta:

```bash
cd web
npm install
npm run build
```

10. Si encuentras errores de rutas, variables de entorno o conexión con la API, corrígelos únicamente dentro de `web`.

Para producción, Vercel debe usar esta variable:

```env
VITE_API_URL=https://utm-desk-nosql-cloud-server-three.vercel.app/api
```

Al finalizar, informa:

- archivos modificados;
- problemas encontrados;
- resultado de `npm run build`;
- URL o ruta exacta utilizada para el login;
- cualquier ajuste que todavía deba realizarse en las variables de Vercel.