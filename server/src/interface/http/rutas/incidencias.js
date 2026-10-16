// Rutas de incidencias. Por ahora: POST / (alta, RF-01).
import { Router } from "express";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { requiereRol } from "../middlewares/roles.js";

/**
 * @param {{auth: object, registrarIncidencia: Function}} deps
 */
export function rutasIncidencias({ auth, registrarIncidencia }) {
  const router = Router();
  const autenticacion = crearAutenticacion(auth);

  // Reportante, técnico y coordinador pueden crear; el directivo solo consulta.
  router.post("/", autenticacion, requiereRol("reportante", "tecnico", "coordinador"), async (req, res) => {
    const doc = await registrarIncidencia(req.usuario, req.body ?? {});
    // ObjectId y Date se serializan solos (string / ISO) con JSON.
    res.status(201).json(doc);
  });

  return router;
}
