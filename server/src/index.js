// Arranque local del servidor: `npm run dev` (puerto 4000).
import "dotenv/config";
import { crearApp } from "./interface/http/app.js";

const puerto = Number(process.env.PORT) || 4000;

crearApp().listen(puerto, () => {
  console.log(`UTM Desk API escuchando en http://localhost:${puerto}/api`);
});
