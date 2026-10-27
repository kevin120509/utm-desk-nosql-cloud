// Rutas del superAdmin, bajo /api/admin. Cada ruta exige JWT válido + usuario activo
// (middleware de autenticación) + rol superAdmin + el permiso específico.
import { Router } from "express";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { requierePermiso } from "../middlewares/roles.js";

/**
 * @param {{auth: object, usuarios: object, administrar: object, catalogos?: object,
 *          incidencias?: {listar: Function, obtener: Function}, metricas?: Function}} deps
 */
export function rutasAdmin({ auth, usuarios, administrar, catalogos, incidencias, metricas }) {
  const router = Router();
  router.use(crearAutenticacion(auth));

  // --- Usuarios y roles ---
  const gestionarUsuarios = requierePermiso("usuarios.gestionar");
  const gestionarRoles = requierePermiso("roles.gestionar");

  router.get("/usuarios", gestionarUsuarios, async (req, res) => {
    res.status(200).json(await usuarios.listar(req.usuario, req.query));
  });
  router.post("/usuarios", gestionarUsuarios, async (req, res) => {
    res.status(201).json(await usuarios.crear(req.usuario, req.body));
  });
  router.get("/usuarios/:id", gestionarUsuarios, async (req, res) => {
    res.status(200).json(await usuarios.obtener(req.usuario, req.params.id));
  });
  router.patch("/usuarios/:id", gestionarUsuarios, async (req, res) => {
    res.status(200).json(await usuarios.actualizar(req.usuario, req.params.id, req.body));
  });
  router.patch("/usuarios/:id/rol", gestionarRoles, async (req, res) => {
    res.status(200).json(await usuarios.cambiarRol(req.usuario, req.params.id, req.body));
  });
  router.patch("/usuarios/:id/estado", gestionarUsuarios, async (req, res) => {
    res.status(200).json(await usuarios.cambiarEstado(req.usuario, req.params.id, req.body));
  });

  // --- Técnicos: disponibilidad y categorías que atienden ---
  router.get("/tecnicos", gestionarUsuarios, async (req, res) => {
    res.status(200).json(await usuarios.listar(req.usuario, { ...req.query, rol: "tecnico" }));
  });
  router.patch("/tecnicos/:id", gestionarUsuarios, async (req, res) => {
    res.status(200).json(await usuarios.actualizarTecnico(req.usuario, req.params.id, req.body));
  });

  // --- Catálogos: categorías, edificios y espacios (se desactivan, nunca se borran) ---
  if (catalogos) {
    const gestionarCatalogos = requierePermiso("catalogos.gestionar");
    router.get("/catalogos", gestionarCatalogos, async (_req, res) => {
      res.status(200).json(await catalogos.listarAdmin());
    });
    router.patch("/catalogos/categorias/:clave", gestionarCatalogos, async (req, res) => {
      res.status(200).json(await catalogos.actualizarCategoria(req.usuario, req.params.clave, req.body));
    });
    router.post("/catalogos/edificios", gestionarCatalogos, async (req, res) => {
      res.status(201).json(await catalogos.crearEdificio(req.usuario, req.body));
    });
    router.patch("/catalogos/edificios/:id", gestionarCatalogos, async (req, res) => {
      res.status(200).json(await catalogos.actualizarEdificio(req.usuario, req.params.id, req.body));
    });
    router.post("/catalogos/edificios/:id/espacios", gestionarCatalogos, async (req, res) => {
      res.status(201).json(await catalogos.agregarEspacio(req.usuario, req.params.id, req.body));
    });
    router.patch("/catalogos/edificios/:id/espacios/:nombre", gestionarCatalogos, async (req, res) => {
      res.status(200).json(await catalogos.actualizarEspacio(req.usuario, req.params.id, req.params.nombre, req.body));
    });
  }

  // --- Consulta: bitácora, seguridad, sistema y métricas (solo lectura) ---
  router.get("/bitacora", requierePermiso("bitacora.consultar"), async (req, res) => {
    res.status(200).json(await administrar.bitacora(req.usuario, { ...req.query, tipo: "admin" }));
  });
  router.get("/seguridad", requierePermiso("seguridad.consultar"), async (req, res) => {
    res.status(200).json(await administrar.bitacora(req.usuario, { ...req.query, tipo: "seguridad" }));
  });
  router.get("/salud", requierePermiso("sistema.consultar"), async (_req, res) => {
    res.status(200).json(await administrar.salud());
  });
  router.get("/resumen", requierePermiso("metricas.consultar"), async (_req, res) => {
    res.status(200).json(await administrar.resumen());
  });

  // Métricas detalladas (prioridad, edificio, tiempo de resolución, técnicos, fallas recurrentes).
  if (metricas) {
    router.get("/metricas", requierePermiso("metricas.consultar"), async (_req, res) => {
      res.status(200).json(await metricas());
    });
  }

  // Vista de incidencias para el superAdmin: lista con búsqueda y expediente con auditoría.
  if (incidencias) {
    router.get("/incidencias", requierePermiso("incidencias.consultar_todas"), async (req, res) => {
      res.status(200).json(await incidencias.listar(req.query));
    });
    router.get("/incidencias/:codigo", requierePermiso("incidencias.consultar_todas"), async (req, res) => {
      res.status(200).json(await incidencias.obtener(req.usuario, req.params.codigo));
    });
  }

  return router;
}
