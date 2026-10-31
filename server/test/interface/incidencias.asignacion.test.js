import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { asignarTecnico, listarTecnicosDisponibles } from "../../src/application/asignarTecnico.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-asignacion";
const ids = { rep: new ObjectId(), tec: new ObjectId(), coord: new ObjectId() };
const codigo = "INC-2026-0001";
let app;

beforeAll(async () => {
  const hash = await bcrypt.hash("test", 4);
  const usuarios = [
    { _id: ids.rep, nombre: "Reportante", correo: "rep@utm.mx", rol: "reportante", activo: true, password_hash: hash },
    { _id: ids.tec, nombre: "Técnico disponible", correo: "tec@utm.mx", rol: "tecnico", activo: true, disponible: true, password_hash: hash },
    { _id: ids.coord, nombre: "Coordinador", correo: "coord@utm.mx", rol: "coordinador", activo: true, password_hash: hash },
  ];
  const doc = {
    codigo,
    estado: "abierta",
    categoria: "computo_redes",
    reportante: { usuario_id: ids.rep, nombre: "Reportante" },
    historial_seguimiento: [],
  };
  const usuariosRepo = {
    buscarPorCorreo: async (correo) => usuarios.find((u) => u.correo === correo) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
    listarTecnicosDisponibles: async () => usuarios.filter((u) => u.rol === "tecnico" && u.activo && u.disponible !== false),
  };
  const incidenciasRepo = {
    buscarPorCodigo: async (c) => (c === codigo ? doc : null),
    asignarTecnico: async ({ asignado, movimiento, ahora }) => {
      doc.asignado_a = asignado;
      doc.fecha_actualizacion = ahora;
      doc.historial_seguimiento.push(movimiento);
      return true;
    },
  };
  const tokens = crearTokens({ secret: SECRET, expiresIn: "1h" });
  const auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens });
  app = crearApp({
    auth,
    incidencias: {
      listar: async () => ({}),
      obtener: async () => doc,
      buscar: async () => ({}),
      registrar: async () => ({}),
      actualizarEstado: async () => ({}),
      asignarTecnico: asignarTecnico({ incidenciasRepo, usuariosRepo }),
      listarTecnicosDisponibles: listarTecnicosDisponibles({ usuariosRepo }),
      editar: async () => ({}),
      eliminar: async () => ({}),
    },
  });
  app.tokens = tokens;
});

function token(rol, id, nombre) {
  return app.tokens.firmar({ sub: String(id), rol, nombre });
}

describe("asignación por coordinador", () => {
  it("lista técnicos disponibles para coordinación", async () => {
    const res = await request(app)
      .get("/api/incidencias/tecnicos/disponibles?categoria=computo_redes")
      .set("Authorization", `Bearer ${token("coordinador", ids.coord, "Coordinador")}`);
    expect(res.status).toBe(200);
    expect(res.body.datos[0]).toMatchObject({ id: String(ids.tec), nombre: "Técnico disponible" });
  });

  it("permite asignar y registra la acción", async () => {
    const res = await request(app)
      .patch(`/api/incidencias/${codigo}/asignacion`)
      .set("Authorization", `Bearer ${token("coordinador", ids.coord, "Coordinador")}`)
      .send({ tecnico_id: String(ids.tec), comentario: "Atender antes del siguiente turno." });
    expect(res.status).toBe(200);
    expect(res.body.asignado_a.usuario_id).toBe(String(ids.tec));
    expect(res.body.historial_seguimiento.at(-1)).toMatchObject({ tipo: "asignacion", comentario: "Atender antes del siguiente turno." });
  });

  it("rechaza la asignación para un reportante", async () => {
    const res = await request(app)
      .patch(`/api/incidencias/${codigo}/asignacion`)
      .set("Authorization", `Bearer ${token("reportante", ids.rep, "Reportante")}`)
      .send({ tecnico_id: String(ids.tec) });
    expect(res.status).toBe(403);
  });
});
