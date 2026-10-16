// Ruta de evidencias: POST /:codigo/evidencias (multipart, campo `archivo`).
// Se monta bajo /api/incidencias.
import { Router } from "express";
import multer from "multer";
import { MAX_BYTES_EVIDENCIA } from "../../../domain/index.js";
import { ErrorApp } from "../../../application/errores.js";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { requiereRol } from "../middlewares/roles.js";

// Memoria: el archivo (máx. ~4 MB) pasa al caso de uso como Buffer y de ahí al bucket.
// El límite de multer es un poco mayor que el real: el caso de uso decide el 400 con su mensaje.
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_EVIDENCIA + 1, files: 1, fields: 5 },
}).single("archivo");

// Cualquier fallo de multer (archivo enorme, campo equivocado…) es un 400 con nuestro formato.
function traducirErrorMulter(err) {
  if (err instanceof multer.MulterError) {
    const mensajes = {
      LIMIT_FILE_SIZE: "El archivo supera el máximo de 4 MB",
      LIMIT_UNEXPECTED_FILE: "El archivo debe enviarse en el campo «archivo»",
      LIMIT_FILE_COUNT: "Solo se permite un archivo por petición",
    };
    return new ErrorApp("ARCHIVO_INVALIDO", mensajes[err.code] ?? "No se pudo leer el archivo enviado");
  }
  return err;
}

/**
 * @param {{auth: object, evidencias: {cargar: Function}}} deps
 */
export function rutasEvidencias({ auth, evidencias }) {
  const router = Router();
  const autenticacion = crearAutenticacion(auth);

  router.post(
    "/:codigo/evidencias",
    autenticacion,
    // El directivo es de solo lectura: se rechaza antes de procesar el archivo.
    requiereRol("reportante", "tecnico", "coordinador"),
    (req, res, next) => subida(req, res, (err) => next(err ? traducirErrorMulter(err) : undefined)),
    async (req, res) => {
      const evidencia = await evidencias.cargar(req.usuario, req.params.codigo, req.file ?? null);
      res.status(201).json(evidencia);
    },
  );

  return router;
}
