// Pruebas HTTP de POST /api/incidencias con la app inyectada con fakes.
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { registrarIncidencia } from "../../src/application/registrarIncidencia.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const idAna = new ObjectId();
const idDir = new ObjectId();

const cuerpo = {
  titulo: "Filtración en el aula A-203",
  descripcion: "Gotea agua del techo sobre los pupitres.",
  prioridad: "media",
  ubicacion: { edificio: "Edificio A", piso: 2, espacio: "A-203" },
  categoria: "infraestructura_fisica",
  detalle_especifico: { tipo_dano: "filtracion", riesgo_seguridad: "bajo", requiere_contratista: false },
};

let app, tokenAna, tokenDir;

beforeAll(async () => {
  const hash = await bcrypt.hash("x" + Math.random(), 4);
  const usuarios = [
    { _id: idAna, nombre: "Ana", correo: "ana@utm.mx", rol: "reportante", tipo: "docente", password_hash: hash, activo: true },
    { _id: idDir, nombre: "Dir", correo: "dir@utm.mx", rol: "directivo", password_hash: hash, activo: true },
  ];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const tokens = crearTokens({ secret: SECRET, expiresIn: "1h" });
  const auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens });
  let n = 0;
  const incidencias = registrarIncidencia({
    incidenciasRepo: { insertar: async (doc) => ({ _id: new ObjectId(), ...doc }) },
    contador: { siguienteDiario: async () => ++n, siguienteAnual: async () => n },
    usuariosRepo,
  });
  app = crearApp({ auth, incidencias: { registrar: incidencias } });
  tokenAna = tokens.firmar({ sub: String(idAna), rol: "reportante", nombre: "Ana" });
  tokenDir = tokens.firmar({ sub: String(idDir), rol: "directivo", nombre: "Dir" });
});

const post = (token, body) => {
  const r = request(app).post("/api/incidencias");
  if (token) r.set("Authorization", `Bearer ${token}`);
  return r.send(body);
};

describe("POST /api/incidencias", () => {
  it("201 con el documento y los ObjectId como string", async () => {
    const res = await post(tokenAna, cuerpo);
    expect(res.status).toBe(201);
    expect(res.body._id).toMatch(/^[0-9a-f]{24}$/);
    expect(res.body.reportante.usuario_id).toBe(String(idAna));
    expect(res.body.codigo).toMatch(/^INC-\d{4}-\d{4}$/);
    expect(res.body.estado).toBe("abierta");
  });

  it("400 VALIDACION con detalle de otra categoría", async () => {
    const res = await post(tokenAna, {
      ...cuerpo,
      detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.0.0.1", vlan: 10, puerto_uplink: "g1", equipos_afectados: 2 },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
    expect(res.body.error.detalles).toBeTypeOf("object");
  });

  it.each(["reportante", "estado", "codigo"])("400 si el cuerpo trae el campo extra %s", async (campo) => {
    const res = await post(tokenAna, { ...cuerpo, [campo]: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
  });

  it("401 sin token", async () => {
    const res = await post(null, cuerpo);
    expect(res.status).toBe(401);
  });

  it("403 para directivo", async () => {
    const res = await post(tokenDir, cuerpo);
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe("SIN_PERMISO");
  });
});
