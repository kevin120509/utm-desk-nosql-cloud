// Pruebas HTTP de PATCH y DELETE /api/incidencias/:codigo (RF-12, repositorios falsos).
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { editarIncidencia } from "../../src/application/editarIncidencia.js";
import { eliminarIncidencia } from "../../src/application/eliminarIncidencia.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const ROLES = { rep: "reportante", tec: "tecnico", coord: "coordinador", dir: "directivo" };
const ids = Object.fromEntries(Object.keys(ROLES).map((k) => [k, new ObjectId()]));
const CODIGO = "INC-2026-0001";
let app, tokens, doc;

beforeAll(async () => {
  const hash = await bcrypt.hash("x" + Math.random(), 4);
  const usuarios = Object.entries(ROLES).map(([k, rol]) => ({
    _id: ids[k], nombre: k, correo: `${k}@utm.mx`, rol, password_hash: hash, activo: true,
  }));
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const incidenciasRepo = {
    buscarPorCodigo: async (c) => (doc && c === doc.codigo ? doc : null),
    editar: async ({ codigo, cambios }) => {
      if (!doc || codigo !== doc.codigo) return false;
      doc = { ...doc, ...cambios.$set };
      return true;
    },
    eliminar: async (c) => {
      if (!doc || c !== doc.codigo) return false;
      doc = null;
      return true;
    },
  };
  const almacen = { eliminarArchivos: async () => {} };
  const tk = crearTokens({ secret: SECRET, expiresIn: "1h" });
  tokens = Object.fromEntries(
    Object.entries(ROLES).map(([k, rol]) => [k, tk.firmar({ sub: String(ids[k]), rol, nombre: k })])
  );
  const auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens: tk });
  app = crearApp({
    auth,
    incidencias: {
      registrar: async () => ({}),
      listar: async () => ({}),
      obtener: async () => ({}),
      buscar: async () => ({}),
      actualizarEstado: async () => ({}),
      editar: editarIncidencia({ incidenciasRepo }),
      eliminar: eliminarIncidencia({ incidenciasRepo, almacen }),
    },
  });
});

beforeEach(() => {
  doc = { _id: new ObjectId(), codigo: CODIGO, estado: "abierta", titulo: "Titulo viejo", evidencias_adjuntas: [] };
});

const llamar = (metodo, codigo, token, body) => {
  const r = request(app)[metodo](`/api/incidencias/${codigo}`);
  if (token) r.set("Authorization", `Bearer ${token}`);
  return body === undefined ? r : r.send(body);
};

describe("PATCH /api/incidencias/:codigo", () => {
  it("200 con el documento actualizado", async () => {
    const res = await llamar("patch", CODIGO, tokens.coord, { titulo: "Titulo nuevo", prioridad: "critica" });
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe("Titulo nuevo");
    expect(res.body.prioridad).toBe("critica");
    expect(res.body.fecha_actualizacion).toBeTruthy();
  });
  it("400 con cuerpo vacío y con campo no editable", async () => {
    expect((await llamar("patch", CODIGO, tokens.coord, {})).status).toBe(400);
    const res = await llamar("patch", CODIGO, tokens.coord, { estado: "cerrada" });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
  });
  it("401 sin token", async () => {
    expect((await llamar("patch", CODIGO, null, { titulo: "Titulo nuevo" })).status).toBe(401);
  });
  it.each(["tec", "rep", "dir"])("403 para %s", async (k) => {
    expect((await llamar("patch", CODIGO, tokens[k], { titulo: "Titulo nuevo" })).status).toBe(403);
  });
  it("404 si no existe", async () => {
    const res = await llamar("patch", "INC-2026-9999", tokens.coord, { titulo: "Titulo nuevo" });
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe("NO_ENCONTRADO");
  });
});

describe("DELETE /api/incidencias/:codigo", () => {
  it("200 { eliminada, codigo } y luego 404", async () => {
    const res = await llamar("delete", CODIGO, tokens.coord);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ eliminada: true, codigo: CODIGO });
    expect((await llamar("delete", CODIGO, tokens.coord)).status).toBe(404);
  });
  it("401 sin token", async () => {
    expect((await llamar("delete", CODIGO, null)).status).toBe(401);
  });
  it.each(["tec", "rep", "dir"])("403 para %s", async (k) => {
    expect((await llamar("delete", CODIGO, tokens[k])).status).toBe(403);
  });
  it("404 si no existe", async () => {
    expect((await llamar("delete", "INC-2026-9999", tokens.coord)).status).toBe(404);
  });
});
