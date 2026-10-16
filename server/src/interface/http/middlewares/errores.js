// Manejador final de errores: SIEMPRE responde { error: { codigo, mensaje, detalles? } }.
// Nunca expone stack ni mensajes internos.
import { ZodError } from "zod";
import { ErrorApp } from "../../../application/errores.js";

// Status HTTP por código de error de aplicación.
const STATUS = {
  CREDENCIALES_INVALIDAS: 401,
  NO_AUTENTICADO: 401,
  SIN_PERMISO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  VALIDACION: 400,
};

// Convierte los issues de Zod en { campo: mensaje }.
function detallesZod(err) {
  const detalles = {};
  for (const issue of err.issues) {
    const campo = issue.path.join(".") || "cuerpo";
    if (!(campo in detalles)) detalles[campo] = issue.message;
  }
  return detalles;
}

// Express exige 4 parámetros para reconocer un manejador de errores.
// eslint-disable-next-line no-unused-vars
export function manejadorErrores(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { codigo: "VALIDACION", mensaje: "Datos inválidos", detalles: detallesZod(err) },
    });
  }
  if (err instanceof ErrorApp) {
    return res
      .status(STATUS[err.codigo] ?? 400)
      .json({ error: { codigo: err.codigo, mensaje: err.message } });
  }
  // JSON malformado (body-parser) u otro error 4xx del cliente.
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { codigo: "JSON_INVALIDO", mensaje: "El cuerpo no es JSON válido" } });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: { codigo: "CUERPO_MUY_GRANDE", mensaje: "El cuerpo es demasiado grande" } });
  }
  // Cualquier otra cosa: se registra en el servidor y el cliente solo ve un mensaje genérico.
  console.error("Error no controlado:", err?.message);
  res.status(500).json({ error: { codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" } });
}
