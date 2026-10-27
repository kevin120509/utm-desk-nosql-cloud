// Pruebas HTTP del módulo admin (/api/admin): acceso por rol, token ausente y vencido,
// y registro en la bitácora. Repositorios en memoria; JWT y middlewares reales.
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { administrarUsuarios } from "../../src/application/administrarUsuarios.js";
import { administrarBitacora } from "../../src/application/administrarBitacora.js";
import { listarRoles, listarPermisos } from "../../src/application/consultarRolesPermisos.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-admin-" + Math.random().toString(36).slice(2);
const tokens = crearTokens({ secret: SECRET, expiresIn: "1h" });

const idSuper = new ObjectId();
const idTec = new ObjectId();
const idRep = new ObjectId();
const idCoord = new ObjectId();

// Usuarios en memoria. Se devuelven copias para que cada prueba parta de cero.
const datosIniciales = () => [
  { _id: idSuper, nombre: "Admin", correo: "admin@utm.mx", rol: "superAdmin", activo: true, password_hash: "$2b$secreto" },
  { _id: idTec, nombre: "Tec", correo: "tec@utm.mx", rol: "tecnico", activo: true, password_hash: "$2b$secreto" },
  { _id: idRep, nombre: "Ana", correo: "ana@utm.mx", rol: "reportante", tipo: "docente", activo: true, password_hash: "$2b$secreto" },
  { _id: idCoord, nombre: "Coord", correo: "coord@utm.mx", rol: "coordinador", activo: true, password_hash: "$2b$secreto" },
];

let usuarios;
const usuariosRepo = {
  async buscarPorId(id) {
    return usuarios.find((u) => String(u._id) === String(id)) ?? null;
  },
  async buscarPorCorreo() {
    return null;
  },
  async listar() {
    return { datos: usuarios.map(({ password_hash, ...r }) => r), total: usuarios.length };
  },
  async listarPorRol(rol) {
    return usuarios.filter((u) => u.rol === rol);
  },
  async contarSuperAdminActivos() {
    return usuarios.filter((u) => u.rol === "superAdmin" && u.activo !== false).length;
  },
  async actualizar(id, cambios) {
    const u = usuarios.find((x) => String(x._id) === String(id));
    if (!u) return false;
    if (cambios.$set) Object.assign(u, cambios.$set);
    if (cambios.$unset) for (const k of Object.keys(cambios.$unset)) delete u[k];
    return true;
  },
};

let bitacoraRegistros;
const bitacoraRepo = {
  async insertar(r) {
    bitacoraRegistros.push(r);
  },
  async listar() {
    return { datos: [...bitacoraRegistros].reverse(), total: bitacoraRegistros.length };
  },
};

let app;
beforeAll(() => {
  usuarios = datosIniciales();
  bitacoraRegistros = [];
  const bitacora = administrarBitacora({ bitacoraRepo });
  app = crearApp({
    auth: autenticar({ usuariosRepo, hasher: { comparar: async () => false }, tokens }),
    admin: {
      usuarios: administrarUsuarios({ usuariosRepo, bitacora }),
      incidencias: { listar: async () => ({ datos: [], total: 0, pagina: 1 }), obtener: async () => ({}) },
      catalogos: async () => ({ categorias: [] }),
      bitacora,
      metricas: async () => ({ por_categoria: [], generado_en: new Date() }),
      sistema: async () => ({ api: { estado: "operativa" } }),
      roles: listarRoles,
      permisos: listarPermisos,
    },
  });
});

const tokenDe = (id, rol) => tokens.firmar({ sub: String(id), rol, nombre: "x" });
const TOKEN_SUPER = () => tokenDe(idSuper, "superAdmin");
const TOKEN_REP = () => tokenDe(idRep, "reportante");
const TOKEN_TEC = () => tokenDe(idTec, "tecnico");
const TOKEN_COORD = () => tokenDe(idCoord, "coordinador");

const conToken = (req, token) => req.set("Authorization", `Bearer ${token}`);

describe("acceso al módulo admin", () => {
  it("superAdmin: 200 en el listado de usuarios, sin contraseñas", async () => {
    const res = await conToken(request(app).get("/api/admin/usuarios"), TOKEN_SUPER());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2b\$/);
  });

  it("reportante: 403 (SIN_PERMISO)", async () => {
    const res = await conToken(request(app).get("/api/admin/usuarios"), TOKEN_REP());
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe("SIN_PERMISO");
  });

  it("coordinador y técnico: 403 en todo el módulo", async () => {
    for (const t of [TOKEN_COORD(), TOKEN_TEC()]) {
      for (const ruta of ["/api/admin/usuarios", "/api/admin/metricas", "/api/admin/sistema", "/api/admin/bitacora", "/api/admin/roles"]) {
        const res = await conToken(request(app).get(ruta), t);
        expect(res.status).toBe(403);
      }
    }
  });

  it("sin token: 401", async () => {
    const res = await request(app).get("/api/admin/usuarios");
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTENTICADO");
  });

  it("token vencido: 401", async () => {
    const vencido = jwt.sign(
      { sub: String(idSuper), rol: "superAdmin", nombre: "x", exp: Math.floor(Date.now() / 1000) - 60 },
      SECRET,
      { algorithm: "HS256" },
    );
    const res = await conToken(request(app).get("/api/admin/usuarios"), vencido);
    expect(res.status).toBe(401);
  });

  it("ruta admin inexistente: 404 con el formato de la API", async () => {
    const res = await conToken(request(app).get("/api/admin/inexistente"), TOKEN_SUPER());
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe("NO_ENCONTRADO");
  });
});

describe("operaciones de usuarios", () => {
  it("suspender a un técnico y verlo en la bitácora", async () => {
    const res = await conToken(request(app).patch(`/api/admin/usuarios/${idTec}/estado`), TOKEN_SUPER()).send({ activo: false });
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);

    const bit = await conToken(request(app).get("/api/admin/bitacora"), TOKEN_SUPER());
    expect(bit.status).toBe(200);
    expect(bit.body.datos[0]).toMatchObject({ accion: "suspender", modulo: "usuarios", resultado: "exito", registro_id: String(idTec) });
  });

  it("no permite suspenderse a sí mismo: 409 y queda rechazado en la bitácora", async () => {
    const res = await conToken(request(app).patch(`/api/admin/usuarios/${idSuper}/estado`), TOKEN_SUPER()).send({ activo: false });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe("OPERACION_NO_PERMITIDA");
    expect(bitacoraRegistros.at(-1)).toMatchObject({ resultado: "rechazado", codigo_error: "OPERACION_NO_PERMITIDA" });
  });

  it("asignar un rol inexistente (soporteTI) -> 400 VALIDACION", async () => {
    const res = await conToken(request(app).patch(`/api/admin/usuarios/${idRep}/roles`), TOKEN_SUPER()).send({ rol: "soporteTI" });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
    expect(res.body.error.detalles).toHaveProperty("rol");
  });

  it("reportante sin tipo -> 400 con el detalle del campo", async () => {
    const res = await conToken(request(app).patch(`/api/admin/usuarios/${idCoord}/roles`), TOKEN_SUPER()).send({ rol: "reportante" });
    expect(res.status).toBe(400);
    expect(res.body.error.detalles).toHaveProperty("tipo");
  });

  it("id de usuario inexistente -> 404", async () => {
    const res = await conToken(request(app).get(`/api/admin/usuarios/${new ObjectId()}`), TOKEN_SUPER());
    expect(res.status).toBe(404);
  });
});

describe("roles, permisos y métricas", () => {
  it("roles: superAdmin tiene todos los permisos administrativos", async () => {
    const res = await conToken(request(app).get("/api/admin/roles"), TOKEN_SUPER());
    expect(res.status).toBe(200);
    const sa = res.body.datos.find((r) => r.rol === "superAdmin");
    expect(sa.permisos).toContain("usuarios:gestionar");
    expect(res.body.datos.find((r) => r.rol === "tecnico").permisos).toEqual([]);
  });

  it("métricas: 200 para superAdmin", async () => {
    const res = await conToken(request(app).get("/api/admin/metricas"), TOKEN_SUPER());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("por_categoria");
  });
});
