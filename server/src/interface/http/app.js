// Capa interface: aquí vive Express. El dominio y los casos de uso no lo conocen.
import express from "express";
import helmet from "helmet";
import cors from "cors";

export function crearApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
  app.use(express.json({ limit: "100kb" }));

  // Comprobación de vida (la usa Vercel y el script de Newman).
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Cualquier ruta que no exista: mismo formato de error que el resto de la API.
  app.use((_req, res) => {
    res.status(404).json({
      error: { codigo: "NO_ENCONTRADO", mensaje: "La ruta solicitada no existe" },
    });
  });

  return app;
}
