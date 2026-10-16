// Límite de peticiones (RNF-03). Protege el login de la fuerza bruta y la API del abuso.
//
// Nota honesta sobre serverless: los contadores viven en la memoria de cada instancia de la
// función. En Vercel pueden existir varias instancias a la vez, así que el límite es por
// instancia (frena a un atacante simple, no es un tope global exacto). Para un tope global
// habría que guardar los contadores en la base de datos.
import { rateLimit } from "express-rate-limit";

const MENSAJE = "Demasiadas peticiones. Espera unos minutos e inténtalo de nuevo.";

function responder429(_req, res, _next, opciones) {
  const segundos = Math.ceil((opciones.windowMs ?? 60_000) / 1000);
  res.setHeader("Retry-After", String(segundos));
  res.status(429).json({ error: { codigo: "DEMASIADAS_PETICIONES", mensaje: MENSAJE } });
}

const base = {
  standardHeaders: "draft-7", // cabeceras RateLimit / RateLimit-Policy
  legacyHeaders: false, // sin X-RateLimit-*
  handler: responder429,
};

/**
 * Límite general para toda la API (por IP).
 * @param {{max?: number, ventanaMs?: number}} [opciones]
 */
export function limiteGeneral({ max = 300, ventanaMs = 15 * 60_000 } = {}) {
  return rateLimit({ ...base, windowMs: ventanaMs, limit: max });
}

/**
 * Límite del login: cuenta solo los intentos FALLIDOS (4xx/5xx). Los inicios de sesión
 * correctos no consumen cupo, así un usuario legítimo nunca se bloquea a sí mismo.
 * @param {{max?: number, ventanaMs?: number}} [opciones]
 */
export function limiteLogin({ max = 10, ventanaMs = 15 * 60_000 } = {}) {
  return rateLimit({ ...base, windowMs: ventanaMs, limit: max, skipSuccessfulRequests: true });
}
