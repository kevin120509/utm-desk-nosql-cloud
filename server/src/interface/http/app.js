// Capa interface: aquí vive Express. El dominio y los casos de uso no lo conocen.
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rutasAuth } from "./rutas/auth.js";
import { rutasIncidencias } from "./rutas/incidencias.js";
import { rutasEtiquetas } from "./rutas/etiquetas.js";
import { rutasEvidencias } from "./rutas/evidencias.js";
import { rutasAnalitica } from "./rutas/analitica.js";
import { manejadorErrores } from "./middlewares/errores.js";
import { limiteGeneral, limiteLogin } from "./middlewares/limites.js";

/**
 * @param {{auth?: {login: Function, usuarioDesdeToken: Function},
 *          incidencias?: {registrar: Function, listar: Function, obtener: Function, buscar: Function, actualizarEstado: Function, editar: Function, eliminar: Function}}} [dependencias]
 *   Casos de uso inyectados. Sin `auth` no se montan las rutas de autenticación;
 *   `incidencias` agrupa los casos de uso de incidencias (alta, lista y expediente).
 */
export function crearApp({ auth, incidencias, etiquetas, evidencias, analitica, limites = {} } = {}) {
  const app = express();

  // Detrás del proxy de Vercel la IP real del cliente viene en X-Forwarded-For (1 salto de confianza).
  // Sin esto, el límite de peticiones vería la IP del proxy y bloquearía a todos juntos.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
  app.use(express.json({ limit: "100kb" }));

  // Comprobación de vida (la usa Vercel y el script de Newman).
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Límite general de peticiones (después de /health, que debe responder siempre).
  app.use("/api", limiteGeneral(limites.general));

  if (auth) {
    // Límite estricto solo para el login: frena la fuerza bruta de contraseñas.
    app.use("/api/auth/login", limiteLogin(limites.login));
    app.use("/api/auth", rutasAuth(auth));
  }

  // Las rutas de incidencias necesitan autenticación y los casos de uso inyectados.
  if (auth && incidencias) {
    app.use("/api/incidencias", rutasIncidencias({ auth, incidencias }));
  }

  // Etiquetas (POST/DELETE /:codigo/tags): router propio montado bajo el mismo prefijo.
  if (auth && etiquetas) {
    app.use("/api/incidencias", rutasEtiquetas({ auth, etiquetas }));
  }

  // Evidencias (POST /:codigo/evidencias, multipart): router propio bajo el mismo prefijo.
  if (auth && evidencias) {
    app.use("/api/incidencias", rutasEvidencias({ auth, evidencias }));
  }

  // Analítica (RF-10): solo coordinador y directivo, bajo /api/analitica.
  if (auth && analitica) {
    app.use("/api/analitica", rutasAnalitica({ auth, analitica }));
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
