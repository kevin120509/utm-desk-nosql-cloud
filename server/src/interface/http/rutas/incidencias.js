// Rutas de incidencias: alta (RF-01), lista (RF-06), expediente (RF-05) y cambio de estado (RF-07).
import { Router } from "express";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { requiereRol } from "../middlewares/roles.js";

/**
 * @param {{auth: object,
 *          incidencias: {registrar: Function, listar: Function, obtener: Function, buscar: Function, actualizarEstado: Function}}} deps
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
  // Búsqueda textual (RF-09): cualquier rol autenticado; el reportante solo ve las suyas.
  router.get("/buscar", autenticacion, async (req, res) => {
    res.status(200).json(await incidencias.buscar(req.usuario, req.query));
  });

  // Expediente completo en una sola lectura.
  router.get("/:codigo", autenticacion, async (req, res) => {
    res.status(200).json(await incidencias.obtener(req.usuario, req.params.codigo));
  });

  // Cambio de estado + bitácora. Solo técnico y coordinador (reportante/directivo -> 403).
  // Es PATCH con sufijo /estado: no choca con GET /:codigo ni con GET /buscar.
  router.patch("/:codigo/estado", autenticacion, requiereRol("tecnico", "coordinador"), async (req, res) => {
    res.status(200).json(await incidencias.actualizarEstado(req.usuario, req.params.codigo, req.body ?? {}));
  });

  return router;
}
