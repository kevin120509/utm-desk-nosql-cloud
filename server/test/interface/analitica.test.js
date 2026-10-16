// Pruebas HTTP de /api/analitica con repositorio falso: forma, vacío, 401 y 403.
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { consultarAnalitica } from "../../src/application/consultarAnalitica.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const roles = ["reportante", "tecnico", "coordinador", "directivo"];

const filaEdificio = { edificio: "Edificio A", promedio_horas_resolucion: 36, total_horas_trabajo: 8, total_incidencias: 2 };
const filaTag = { tag: "wifi", total: 3, edificios: ["Biblioteca", "Edificio A"] };

let tokens;

async function crear(analiticaRepo) {
  const hash = await bcrypt.hash("x" + Math.random(), 4);
  const usuarios = roles.map((rol) => ({
    _id: new ObjectId(), nombre: rol, correo: `${rol}@utm.mx`, rol, password_hash: hash, activo: true,
  }));
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const t = crearTokens({ secret: SECRET, expiresIn: "1h" });
  const auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens: t });
  tokens = Object.fromEntries(usuarios.map((u) => [u.rol, t.firmar({ sub: String(u._id), rol: u.rol, nombre: u.nombre })]));
  return crearApp({ auth, analitica: consultarAnalitica({ analiticaRepo }) });
}

const con = (r, token) => (token ? r.set("Authorization", `Bearer ${token}`) : r);

describe("GET /api/analitica/*", () => {
  let app, appVacia;
  beforeAll(async () => {
    appVacia = await crear({ eficienciaPorEdificio: async () => [], topTags: async () => [] });
    const tokensVacia = tokens;
    app = await crear({ eficienciaPorEdificio: async () => [filaEdificio], topTags: async () => [filaTag] });
    // Cada app tiene su propio juego de usuarios; se conservan ambos juegos de tokens.
    app.tokensVacia = tokensVacia;
  });

  it("edificios: 200 { datos } para coordinador y directivo", async () => {
    for (const rol of ["coordinador", "directivo"]) {
      const res = await con(request(app).get("/api/analitica/edificios"), tokens[rol]);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ datos: [filaEdificio] });
    }
  });

  it("tags: 200 { datos } para coordinador y directivo", async () => {
    for (const rol of ["coordinador", "directivo"]) {
      const res = await con(request(app).get("/api/analitica/tags"), tokens[rol]);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ datos: [filaTag] });
    }
  });

  it("sin datos: 200 con lista vacía", async () => {
    const a = await con(request(appVacia).get("/api/analitica/edificios"), app.tokensVacia.coordinador);
    const b = await con(request(appVacia).get("/api/analitica/tags"), app.tokensVacia.directivo);
    expect(a.status).toBe(200);
    expect(a.body).toEqual({ datos: [] });
    expect(b.status).toBe(200);
    expect(b.body).toEqual({ datos: [] });
  });

  it("sin token: 401", async () => {
    for (const ruta of ["edificios", "tags"]) {
      const res = await request(app).get(`/api/analitica/${ruta}`);
      expect(res.status).toBe(401);
    }
  });

  it("reportante y técnico: 403", async () => {
    for (const ruta of ["edificios", "tags"]) {
      for (const rol of ["reportante", "tecnico"]) {
        const res = await con(request(app).get(`/api/analitica/${ruta}`), tokens[rol]);
        expect(res.status).toBe(403);
        expect(res.body.error.codigo).toBe("SIN_PERMISO");
      }
    }
  });
});
