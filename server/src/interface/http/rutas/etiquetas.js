// Rutas de etiquetas: POST /:codigo/tags y DELETE /:codigo/tags/:tag (se montan bajo /api/incidencias).
import { Router } from "express";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { requiereRol } from "../middlewares/roles.js";

/**
 * @param {{auth: object, etiquetas: {agregar: Function, quitar: Function}}} deps
 */
export function rutasEtiquetas({ auth, etiquetas }) {
  const router = Router();
  const autenticacion = crearAutenticacion(auth);
  const soloPersonal = requiereRol("tecnico", "coordinador");

  router.post("/:codigo/tags", autenticacion, soloPersonal, async (req, res) => {
    res.status(200).json(await etiquetas.agregar(req.usuario, req.params.codigo, req.body ?? {}));
  });

  // Express ya decodifica %20 y similares en req.params.
  router.delete("/:codigo/tags/:tag", autenticacion, soloPersonal, async (req, res) => {
    res.status(200).json(await etiquetas.quitar(req.usuario, req.params.codigo, req.params.tag));
  });

  return router;
}
