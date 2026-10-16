// Arranque local del servidor: `npm run dev` (puerto 4000).
// En Vercel no se usa este archivo: ahí entra `api/index.js`.
import "dotenv/config";
import { construirApp } from "./aplicacion.js";

const puerto = Number(process.env.PORT) || 4000;

const app = await construirApp();
app.listen(puerto, () => {
  console.log(`UTM Desk API escuchando en http://localhost:${puerto}/api`);
});
