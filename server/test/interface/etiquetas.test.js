// Pruebas HTTP de las rutas de etiquetas con repositorio falso en memoria.
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { gestionarEtiquetas } from "../../src/application/gestionarEtiquetas.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const ids = { rep: new ObjectId(), tec: new ObjectId(), dir: new ObjectId(), coo: new ObjectId() };

let app, tokens, tags;

// "Base de datos" de una sola incidencia con $addToSet / $pull simulados.
const etiquetasRepo = {
  async agregar(codigo, tag) {
    if (codigo !== "INC-2026-0001") return null;
    if (!tags.includes(tag)) tags.push(tag);
    return [...tags];
  },
  async quitar(codigo, tag) {
    if (codigo !== "INC-2026-0001") return null;
    tags = tags.filter((t) => t !== tag);
    return [...tags];
  },
};

beforeAll(async () => {
  const hash = await bcrypt.hash("x" + Math.random(), 4);
  const mk = (_id, rol) => ({ _id, nombre: rol, correo: `${rol}@utm.mx`, rol, password_hash: hash, activo: true });
  const usuarios = [mk(ids.rep, "reportante"), mk(ids.tec, "tecnico"), mk(ids.dir, "directivo"), mk(ids.coo, "coordinador")];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const t = crearTokens({ secret: SECRET, expiresIn: "1h" });
  const auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens: t });
  app = crearApp({
    auth,
    incidencias: { registrar: async () => ({}), listar: async () => ({}), obtener: async () => ({}) },
    etiquetas: gestionarEtiquetas({ etiquetasRepo }),
  });
  tokens = Object.fromEntries(usuarios.map((u) => [u.rol, t.firmar({ sub: String(u._id), rol: u.rol, nombre: u.nombre })]));
});

beforeEach(() => {
  tags = ["switch"];
});

const con = (r, token) => (token ? r.set("Authorization", `Bearer ${token}`) : r);

describe("POST /api/incidencias/:codigo/tags", () => {
  it("200 con { tags } y normaliza el formato", async () => {
    const res = await con(request(app).post("/api/incidencias/INC-2026-0001/tags"), tokens.tecnico).send({ tag: " Sin-Red " });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tags: ["switch", "sin-red"] });
  });

  it("dos POST iguales con distinto formato dejan una sola etiqueta", async () => {
    await con(request(app).post("/api/incidencias/INC-2026-0001/tags"), tokens.coordinador).send({ tag: "Wifi" });
    const res = await con(request(app).post("/api/incidencias/INC-2026-0001/tags"), tokens.coordinador).send({ tag: "wifi " });
    expect(res.status).toBe(200);
    expect(res.body.tags.filter((t) => t === "wifi")).toHaveLength(1);
  });

  it("400 VALIDACION con detalles", async () => {
    const res = await con(request(app).post("/api/incidencias/INC-2026-0001/tags"), tokens.tecnico).send({ tag: "a" });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
    expect(res.body.error.detalles.tag).toBeTypeOf("string");
  });

  it("401 sin token, 403 reportante y directivo, 404 inexistente", async () => {
    const url = "/api/incidencias/INC-2026-0001/tags";
    expect((await request(app).post(url).send({ tag: "wifi" })).status).toBe(401);
    expect((await con(request(app).post(url), tokens.reportante).send({ tag: "wifi" })).status).toBe(403);
    expect((await con(request(app).post(url), tokens.directivo).send({ tag: "wifi" })).status).toBe(403);
    const r = await con(request(app).post("/api/incidencias/INC-2026-9999/tags"), tokens.tecnico).send({ tag: "wifi" });
    expect(r.status).toBe(404);
    expect(r.body.error.codigo).toBe("NO_ENCONTRADO");
  });
});

describe("DELETE /api/incidencias/:codigo/tags/:tag", () => {
  it("200 y quita la etiqueta", async () => {
    const res = await con(request(app).delete("/api/incidencias/INC-2026-0001/tags/switch"), tokens.tecnico);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tags: [] });
  });

  it("decodifica etiquetas con caracteres codificados (sin%20red)", async () => {
    tags = ["sin red"];
    const res = await con(request(app).delete("/api/incidencias/INC-2026-0001/tags/sin%20red"), tokens.tecnico);
    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual([]);
  });

  it("quitar una etiqueta que no está responde 200 igual", async () => {
    const res = await con(request(app).delete("/api/incidencias/INC-2026-0001/tags/inexistente"), tokens.tecnico);
    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual(["switch"]);
  });

  it("403 para reportante, 404 para incidencia inexistente", async () => {
    expect((await con(request(app).delete("/api/incidencias/INC-2026-0001/tags/switch"), tokens.reportante)).status).toBe(403);
    expect((await con(request(app).delete("/api/incidencias/INC-2026-9999/tags/switch"), tokens.tecnico)).status).toBe(404);
  });
});
