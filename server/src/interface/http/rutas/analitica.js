// Rutas de analítica (RF-10): GET /edificios y GET /tags, montadas bajo /api/analitica.
import { Router } from "express";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { requiereRol } from "../middlewares/roles.js";

/**
 * @param {{auth: object, analitica: {edificios: Function, tags: Function}}} deps
 */
export function rutasAnalitica({ auth, analitica }) {
  const router = Router();
  const autenticacion = crearAutenticacion(auth);
  const soloGestion = requiereRol("coordinador", "directivo");

  router.get("/edificios", autenticacion, soloGestion, async (req, res) => {
    res.status(200).json(await analitica.edificios(req.usuario));
  });

  router.get("/tags", autenticacion, soloGestion, async (req, res) => {
    res.status(200).json(await analitica.tags(req.usuario));
  });

  return router;
}
