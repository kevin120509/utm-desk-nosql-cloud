// Función serverless de Vercel: toda petición (ver vercel.json) entra aquí y se la pasa a Express.
// La app se construye una sola vez por instancia "caliente"; el cliente de Mongo se reutiliza
// entre invocaciones (globalThis en cliente.js), así solo la primera petición paga la conexión.
import { construirApp } from "../src/aplicacion.js";

let promesaApp;

export default async function handler(req, res) {
  try {
    // Si la construcción falla (p. ej. falta una variable), la siguiente petición reintenta.
    promesaApp ??= construirApp().catch((e) => {
      promesaApp = undefined;
      throw e;
    });
    const app = await promesaApp;
    return app(req, res);
  } catch (e) {
    // Nunca se filtra el detalle: solo al registro del servidor.
    console.error("No se pudo iniciar la API:", e?.message);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { codigo: "ERROR_INTERNO", mensaje: "El servicio no está disponible" } }));
  }
}
