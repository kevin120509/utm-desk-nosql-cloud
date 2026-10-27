// Cliente HTTP mínimo sobre fetch para hablar con la API (plan §6).
import { leerSesion, borrarSesion } from "../auth/almacen.js";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Error con el formato de la API: { error: { codigo, mensaje, detalles? } }
export class ErrorApi extends Error {
  constructor({ codigo, mensaje, detalles, status }) {
    super(mensaje);
    this.name = "ErrorApi";
    this.codigo = codigo;
    this.mensaje = mensaje;
    this.detalles = detalles;
    this.status = status;
  }
}

async function peticion(metodo, ruta, cuerpo, signal) {
  const cabeceras = {};
  const sesion = leerSesion();
  if (sesion?.token) cabeceras.Authorization = `Bearer ${sesion.token}`;

  const opciones = { method: metodo, headers: cabeceras, signal };
  if (cuerpo instanceof FormData) {
    opciones.body = cuerpo; // el navegador pone el boundary multipart
  } else if (cuerpo !== undefined) {
    cabeceras["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, opciones);
  } catch (e) {
    // Una petición cancelada con AbortController no es un error de red.
    if (e?.name === "AbortError") throw e;
    throw new ErrorApi({
      codigo: "RED",
      mensaje: "No se pudo conectar con el servidor. Revisa tu conexión.",
      status: 0,
    });
  }

  // El cuerpo puede venir vacío o no ser JSON: no debe romper el cliente.
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    const e = datos?.error || {};
    // 401 con sesión activa = token vencido: limpiar y volver al login.
    // En el propio login un 401 solo significa credenciales inválidas.
    if (respuesta.status === 401 && sesion && ruta !== "/auth/login") {
      borrarSesion();
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    throw new ErrorApi({
      codigo: e.codigo || "ERROR",
      mensaje: e.mensaje || `Error ${respuesta.status}`,
      detalles: e.detalles,
      status: respuesta.status,
    });
  }
  return datos;
}

export const api = {
  // `signal` (opcional) permite cancelar la petición con AbortController.
  get: (ruta, signal) => peticion("GET", ruta, undefined, signal),
  post: (ruta, cuerpo) => peticion("POST", ruta, cuerpo),
  patch: (ruta, cuerpo) => peticion("PATCH", ruta, cuerpo),
  delete: (ruta) => peticion("DELETE", ruta),
};
