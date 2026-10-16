// Pruebas HTTP de GET /api/incidencias/buscar (repositorio falso).
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { buscarIncidencias } from "../../src/application/buscarIncidencias.js";
import { obtenerIncidencia } from "../../src/application/consultarIncidencias.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const idAna = new ObjectId();
const idBeto = new ObjectId();
const idTec = new ObjectId();

const inc = (n, dueno, score) => ({
  _id: new ObjectId(),
  codigo: `INC-2026-${String(n).padStart(4, "0")}`,
  titulo: `Incidencia ${n}`,
  reportante: { usuario_id: dueno, nombre: "X" },
  score,
});
const base = [inc(1, idAna, 0.8), inc(2, idBeto, 2.4), inc(3, idAna, 1.6)];

// Repo en memoria: filtra por propietario y ordena por score descendente.
const incidenciasRepo = {
  async buscarTexto({ propietarioId, limite }) {
    return base
      .filter((d) => !propietarioId || String(d.reportante.usuario_id) === propietarioId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limite);
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
      listar: async () => ({ datos: [], total: 0, pagina: 1 }),
      obtener: obtenerIncidencia({ incidenciasRepo }),
      buscar: buscarIncidencias({ incidenciasRepo }),
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

describe("GET /api/incidencias/buscar", () => {
  it("401 sin token", async () => {
    expect((await get("/api/incidencias/buscar?q=red")).status).toBe(401);
  });

  it("200 { datos } ordenado por relevancia y con score", async () => {
    const res = await get("/api/incidencias/buscar?q=red", tokenTec);
    expect(res.status).toBe(200);
    expect(res.body.datos.map((d) => d.codigo)).toEqual(["INC-2026-0002", "INC-2026-0003", "INC-2026-0001"]);
    expect(res.body.datos.map((d) => d.score)).toEqual([2.4, 1.6, 0.8]);
  });

  it("un reportante solo recibe las suyas", async () => {
    const res = await get("/api/incidencias/buscar?q=red", tokenAna);
    expect(res.status).toBe(200);
    expect(res.body.datos.map((d) => d.codigo)).toEqual(["INC-2026-0003", "INC-2026-0001"]);
  });

  it.each(["", "?q=", "?q=%20%20%20", "?q=red&x=1", `?q=${"a".repeat(101)}`])("400 VALIDACION con %s", async (qs) => {
    const res = await get(`/api/incidencias/buscar${qs}`, tokenTec);
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
  });

  it("/buscar no se interpreta como código y GET /:codigo sigue funcionando", async () => {
    const buscar = await get("/api/incidencias/buscar?q=red", tokenTec);
    expect(buscar.status).toBe(200); // no 404 NO_ENCONTRADO de obtener()
    const exp = await get("/api/incidencias/INC-2026-0002", tokenTec);
    expect(exp.status).toBe(200);
    expect(exp.body.codigo).toBe("INC-2026-0002");
  });
});
