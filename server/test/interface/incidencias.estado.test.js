// Pruebas HTTP de PATCH /api/incidencias/:codigo/estado (repositorios falsos).
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { actualizarEstado } from "../../src/application/actualizarEstado.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const ids = { rep: new ObjectId(), tec: new ObjectId(), coord: new ObjectId(), dir: new ObjectId() };
const CODIGO = "INC-2026-0001";

let app, tokens, doc, aplicar;

beforeAll(async () => {
  const hash = await bcrypt.hash("x" + Math.random(), 4);
  const usuarios = [
    { _id: ids.rep, nombre: "Rep", correo: "rep@utm.mx", rol: "reportante", tipo: "docente", password_hash: hash, activo: true },
    { _id: ids.tec, nombre: "Tec", correo: "tec@utm.mx", rol: "tecnico", password_hash: hash, activo: true },
    { _id: ids.coord, nombre: "Coord", correo: "coord@utm.mx", rol: "coordinador", password_hash: hash, activo: true },
    { _id: ids.dir, nombre: "Dir", correo: "dir@utm.mx", rol: "directivo", password_hash: hash, activo: true },
  ];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const incidenciasRepo = {
    buscarPorCodigo: async (c) => (c === doc.codigo ? doc : null),
    actualizarEstado: async ({ cambios }) => {
      if (!aplicar) return false;
      doc = { ...doc, ...cambios.$set };
      return true;
    },
  };
  const tk = crearTokens({ secret: SECRET, expiresIn: "1h" });
  tokens = {
    rep: tk.firmar({ sub: String(ids.rep), rol: "reportante", nombre: "Rep" }),
    tec: tk.firmar({ sub: String(ids.tec), rol: "tecnico", nombre: "Tec" }),
    coord: tk.firmar({ sub: String(ids.coord), rol: "coordinador", nombre: "Coord" }),
    dir: tk.firmar({ sub: String(ids.dir), rol: "directivo", nombre: "Dir" }),
  };
  const auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens: tk });
  app = crearApp({
    auth,
    incidencias: {
      registrar: async () => ({}),
      listar: async () => ({}),
      obtener: async () => ({}),
      actualizarEstado: actualizarEstado({ incidenciasRepo, usuariosRepo }),
    },
  });
});

beforeEach(() => {
  doc = { _id: new ObjectId(), codigo: CODIGO, estado: "abierta", horas_invertidas: 0 };
  aplicar = true;
});

const cuerpo = { estado_nuevo: "en proceso", horas: 2, comentario: "Revisando el equipo" };
const patch = (codigo, body, token) => {
  const r = request(app).patch(`/api/incidencias/${codigo}/estado`);
  if (token) r.set("Authorization", `Bearer ${token}`);
  return r.send(body);
};

describe("PATCH /api/incidencias/:codigo/estado", () => {
  it("200 con el documento actualizado", async () => {
    const res = await patch(CODIGO, cuerpo, tokens.tec);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("en proceso");
    expect(res.body.codigo).toBe(CODIGO);
  });

  it("400 VALIDACION con horas fuera de rango", async () => {
    const res = await patch(CODIGO, { ...cuerpo, horas: 25 }, tokens.tec);
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
  });

  it("400 TRANSICION_INVALIDA (técnico intenta cerrar)", async () => {
    doc.estado = "resuelta";
    const res = await patch(CODIGO, { ...cuerpo, estado_nuevo: "cerrada" }, tokens.tec);
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("TRANSICION_INVALIDA");
  });

  it("401 sin token", async () => {
    expect((await patch(CODIGO, cuerpo)).status).toBe(401);
  });

  it("403 para reportante y directivo", async () => {
    expect((await patch(CODIGO, cuerpo, tokens.rep)).status).toBe(403);
    expect((await patch(CODIGO, cuerpo, tokens.dir)).status).toBe(403);
  });

  it("404 si la incidencia no existe", async () => {
    const res = await patch("INC-2026-9999", cuerpo, tokens.tec);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe("NO_ENCONTRADO");
  });

  it("409 si otra persona cambió el estado antes", async () => {
    aplicar = false;
    const res = await patch(CODIGO, cuerpo, tokens.coord);
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe("CONFLICTO");
  });
});
