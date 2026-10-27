// Pruebas HTTP de GET /api/incidencias y GET /api/incidencias/:codigo (repositorio falso).
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { listarIncidencias, obtenerIncidencia } from "../../src/application/consultarIncidencias.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const idAna = new ObjectId();
const idBeto = new ObjectId();
const idTec = new ObjectId();

const incidencia = (n, dueno, extra = {}) => ({
  _id: new ObjectId(),
  codigo: `INC-2026-${String(n).padStart(4, "0")}`,
  titulo: `Incidencia ${n}`,
  categoria: "infraestructura_fisica",
  estado: "abierta",
  prioridad: "media",
  ubicacion: { edificio: "Edificio A", espacio: "A-1" },
  reportante: { usuario_id: dueno, nombre: "X" },
  fecha_creacion: new Date(2026, 9, n),
  ...extra,
});

const base = [
  incidencia(1, idAna),
  incidencia(2, idBeto, { categoria: "servicios_academicos", prioridad: "alta" }),
  incidencia(3, idAna, { estado: "en proceso" }),
];

// Repo en memoria que imita lo esencial de IncidenciasRepoMongo.
const incidenciasRepo = {
  async listar({ filtros = {}, propietarioId, pagina, limite }) {
    let r = base.filter((d) => {
      if (filtros.categoria && d.categoria !== filtros.categoria) return false;
      if (filtros.estado && d.estado !== filtros.estado) return false;
      if (filtros.prioridad && d.prioridad !== filtros.prioridad) return false;
      if (filtros.edificio && d.ubicacion.edificio !== filtros.edificio) return false;
      if (propietarioId && String(d.reportante.usuario_id) !== propietarioId) return false;
      return true;
    });
    r = r.sort((a, b) => b.fecha_creacion - a.fecha_creacion);
    return { datos: r.slice((pagina - 1) * limite, pagina * limite), total: r.length };
  },
  async buscarPorCodigo(codigo) {
    return base.find((d) => d.codigo === codigo) ?? null;
  },
};

let app, tokenAna, tokenTec;

beforeAll(async () => {
  const hash = await bcrypt.hash("x" + Math.random(), 4);
  const usuarios = [
    { _id: idAna, nombre: "Ana", correo: "ana@utm.mx", rol: "reportante", tipo: "docente", password_hash: hash, activo: true },
    { _id: idTec, nombre: "Tec", correo: "tec@utm.mx", rol: "tecnico", password_hash: hash, activo: true },
  ];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const tokens = crearTokens({ secret: SECRET, expiresIn: "1h" });
  const auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens });
  app = crearApp({
    auth,
    incidencias: {
      registrar: async () => ({}),
      listar: listarIncidencias({ incidenciasRepo }),
      obtener: obtenerIncidencia({ incidenciasRepo }),
    },
  });
  tokenAna = tokens.firmar({ sub: String(idAna), rol: "reportante", nombre: "Ana" });
  tokenTec = tokens.firmar({ sub: String(idTec), rol: "tecnico", nombre: "Tec" });
});

const get = (ruta, token) => {
  const r = request(app).get(ruta);
  if (token) r.set("Authorization", `Bearer ${token}`);
  return r;
};

describe("GET /api/incidencias", () => {
  it("401 sin token", async () => {
    const res = await get("/api/incidencias");
    expect(res.status).toBe(401);
  });

  it("200 con { datos, total, pagina } para el personal, más reciente primero", async () => {
    const res = await get("/api/incidencias", tokenTec);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.pagina).toBe(1);
    expect(res.body.datos.map((d) => d.codigo)).toEqual(["INC-2026-0003", "INC-2026-0002", "INC-2026-0001"]);
    expect(res.body.datos[0]._id).toMatch(/^[0-9a-f]{24}$/);
  });

  it("filtra por categoría, estado y prioridad", async () => {
    const res = await get("/api/incidencias?categoria=servicios_academicos&prioridad=alta", tokenTec);
    expect(res.status).toBe(200);
    expect(res.body.datos.map((d) => d.codigo)).toEqual(["INC-2026-0002"]);
  });

  it("pagina con limite", async () => {
    const res = await get("/api/incidencias?pagina=2&limite=2", tokenTec);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.pagina).toBe(2);
    expect(res.body.datos).toHaveLength(1);
  });

  it("un reportante solo ve las suyas", async () => {
    const res = await get("/api/incidencias", tokenAna);
    expect(res.status).toBe(200);
    expect(res.body.datos.map((d) => d.codigo).sort()).toEqual(["INC-2026-0001", "INC-2026-0003"]);
    expect(res.body.total).toBe(2);
  });

  it("400 VALIDACION con detalles por campo si la query es inválida", async () => {
    const res = await get("/api/incidencias?estado=nada&limite=999", tokenTec);
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
    expect(res.body.error.detalles.estado).toBeTypeOf("string");
    expect(res.body.error.detalles.limite).toBeTypeOf("string");
  });
});

describe("GET /api/incidencias/:codigo", () => {
  it("200 con el documento al personal", async () => {
    const res = await get("/api/incidencias/INC-2026-0002", tokenTec);
    expect(res.status).toBe(200);
    expect(res.body.codigo).toBe("INC-2026-0002");
    expect(res.body.reportante.usuario_id).toBe(String(idBeto));
  });

  it("200 al reportante dueño", async () => {
    const res = await get("/api/incidencias/INC-2026-0001", tokenAna);
    expect(res.status).toBe(200);
  });

  it("403 SIN_PERMISO para un reportante ajeno", async () => {
    const res = await get("/api/incidencias/INC-2026-0002", tokenAna);
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe("SIN_PERMISO");
  });

  it("404 NO_ENCONTRADO si no existe o el código no tiene forma válida", async () => {
    const a = await get("/api/incidencias/INC-2026-9999", tokenTec);
    expect(a.status).toBe(404);
    expect(a.body.error.codigo).toBe("NO_ENCONTRADO");
    const b = await get("/api/incidencias/no-es-codigo", tokenTec);
    expect(b.status).toBe(404);
  });

  it("401 sin token", async () => {
    const res = await get("/api/incidencias/INC-2026-0001");
    expect(res.status).toBe(401);
  });
});
