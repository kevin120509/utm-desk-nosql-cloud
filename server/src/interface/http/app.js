// Capa interface: aquí vive Express. El dominio y los casos de uso no lo conocen.
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rutasAuth } from "./rutas/auth.js";
import { rutasIncidencias } from "./rutas/incidencias.js";
import { manejadorErrores } from "./middlewares/errores.js";

/**
 * @param {{auth?: {login: Function, usuarioDesdeToken: Function},
 *          incidencias?: {registrar: Function, listar: Function, obtener: Function}}} [dependencias]
 *   Casos de uso inyectados. Sin `auth` no se montan las rutas de autenticación;
 *   `incidencias` agrupa los casos de uso de incidencias (alta, lista y expediente).
 */
export function crearApp({ auth, incidencias } = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
  app.use(express.json({ limit: "100kb" }));

  // Comprobación de vida (la usa Vercel y el script de Newman).
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  if (auth) app.use("/api/auth", rutasAuth(auth));

  // Las rutas de incidencias necesitan autenticación y los casos de uso inyectados.
  if (auth && incidencias) {
    app.use("/api/incidencias", rutasIncidencias({ auth, incidencias }));
  }

  // Cualquier ruta que no exista: mismo formato de error que el resto de la API.
  app.use((_req, res) => {
    res.status(404).json({
      error: { codigo: "NO_ENCONTRADO", mensaje: "La ruta solicitada no existe" },
    });
  });

  // Siempre al final: convierte cualquier error en { error: { codigo, mensaje } }.
  app.use(manejadorErrores);

  return app;
}
