// Rutas del módulo administrativo (superAdmin), montadas bajo /api/admin.
// Cada ruta exige sesión válida (autenticacion) y un permiso concreto (requierePermiso).
import { Router } from "express";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { requierePermiso } from "../middlewares/permisos.js";

/**
 * @param {{auth: object, admin: {usuarios: object, incidencias: object, catalogos: Function,
 *                               bitacora: object, metricas: Function, sistema: Function,
 *                               roles: Function, permisos: Function}}} deps
 *   Casos de uso inyectados. `actor` que llega a los casos de uso = usuario + IP (para la bitácora).
 */
export function rutasAdmin({ auth, admin }) {
  const router = Router();
  const autenticacion = crearAutenticacion(auth);
  const actor = (req) => (req.ip ? { ...req.usuario, ip: req.ip } : req.usuario);

  // Usuarios
  router.get("/usuarios", autenticacion, requierePermiso("usuarios:leer"), async (req, res) => {
    res.status(200).json(await admin.usuarios.listar(req.query));
  });
  router.get("/usuarios/:id", autenticacion, requierePermiso("usuarios:leer"), async (req, res) => {
    res.status(200).json(await admin.usuarios.detalle(req.params.id));
  });
  router.patch("/usuarios/:id/estado", autenticacion, requierePermiso("usuarios:gestionar"), async (req, res) => {
    res.status(200).json(await admin.usuarios.cambiarEstado(actor(req), req.params.id, req.body));
  });
  router.patch("/usuarios/:id/roles", autenticacion, requierePermiso("usuarios:gestionar"), async (req, res) => {
    res.status(200).json(await admin.usuarios.cambiarRol(actor(req), req.params.id, req.body));
  });

  // Roles y permisos (solo lectura)
  router.get("/roles", autenticacion, requierePermiso("roles:leer"), (_req, res) => {
    res.status(200).json({ datos: admin.roles() });
  });
  router.get("/permisos", autenticacion, requierePermiso("roles:leer"), (_req, res) => {
    res.status(200).json({ datos: admin.permisos() });
  });

  // Catálogos (solo lectura por ahora)
  router.get("/catalogos", autenticacion, requierePermiso("catalogos:leer"), async (_req, res) => {
    res.status(200).json(await admin.catalogos());
  });

  // Incidencias (vista admin, solo lectura)
  router.get("/incidencias", autenticacion, requierePermiso("incidencias:leer"), async (req, res) => {
    res.status(200).json(await admin.incidencias.listar(req.query));
  });
  router.get("/incidencias/:codigo", autenticacion, requierePermiso("incidencias:leer"), async (req, res) => {
    res.status(200).json(await admin.incidencias.obtener(req.usuario, req.params.codigo));
  });

  // Bitácora, métricas y sistema
  router.get("/bitacora", autenticacion, requierePermiso("bitacora:leer"), async (req, res) => {
    res.status(200).json(await admin.bitacora.listar(req.query));
  });
  router.get("/metricas", autenticacion, requierePermiso("metricas:leer"), async (_req, res) => {
    res.status(200).json(await admin.metricas());
  });
  router.get("/sistema", autenticacion, requierePermiso("sistema:leer"), async (_req, res) => {
    res.status(200).json(await admin.sistema());
  });

  return router;
}
