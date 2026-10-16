// Rutas de incidencias: alta (RF-01), lista (RF-06) y expediente (RF-05).
import { Router } from "express";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { requiereRol } from "../middlewares/roles.js";

/**
 * @param {{auth: object,
 *          incidencias: {registrar: Function, listar: Function, obtener: Function}}} deps
 *   Casos de uso inyectados (la capa HTTP no conoce Mongo).
 */
export function rutasIncidencias({ auth, incidencias }) {
  const router = Router();
  const autenticacion = crearAutenticacion(auth);

  // Reportante, técnico y coordinador pueden crear; el directivo solo consulta.
  router.post("/", autenticacion, requiereRol("reportante", "tecnico", "coordinador"), async (req, res) => {
    const doc = await incidencias.registrar(req.usuario, req.body ?? {});
    // ObjectId y Date se serializan solos (string / ISO) con JSON.
    res.status(201).json(doc);
  });

  // Lista con filtros y paginación. El caso de uso limita al reportante a sus propias incidencias.
  router.get("/", autenticacion, async (req, res) => {
    res.status(200).json(await incidencias.listar(req.usuario, req.query));
  });

  // B10 (búsqueda): `GET /buscar` DEBE registrarse AQUÍ, antes de `/:codigo`,
  // o Express tomaría la palabra "buscar" como si fuera un código.

  // Expediente completo en una sola lectura.
  router.get("/:codigo", autenticacion, async (req, res) => {
    res.status(200).json(await incidencias.obtener(req.usuario, req.params.codigo));
  });

  return router;
}
