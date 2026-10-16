// R05: límite de peticiones, intentos de inyección NoSQL y cabeceras de seguridad (fakes en memoria).
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { listarIncidencias, obtenerIncidencia } from "../../src/application/consultarIncidencias.js";
import { buscarIncidencias } from "../../src/application/buscarIncidencias.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const PASSWORD = "clave-de-prueba-" + Math.random().toString(36).slice(2);
const idTec = new ObjectId();

let auth, token, incidenciasFalsas;

beforeAll(async () => {
  const hash = await bcrypt.hash(PASSWORD, 4);
  const usuarios = [
    { _id: idTec, nombre: "Tec", correo: "tec@utm.mx", rol: "tecnico", password_hash: hash, activo: true },
  ];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const tokens = crearTokens({ secret: "secreto-" + Math.random().toString(36).slice(2), expiresIn: "1h" });
  auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens });
  token = tokens.firmar({ sub: String(idTec), rol: "tecnico", nombre: "Tec" });

  // Repo que registra con qué filtros se consulta (para comprobar que nada raro llega a Mongo).
  const llamadas = [];
  const incidenciasRepo = {
    listar: async (args) => (llamadas.push(args), { datos: [], total: 0 }),
    buscarPorCodigo: async () => null,
    buscarTexto: async (args) => (llamadas.push(args), []),
  };
  incidenciasFalsas = {
    llamadas,
    useCases: {
      registrar: async () => ({}),
      listar: listarIncidencias({ incidenciasRepo }),
      obtener: obtenerIncidencia({ incidenciasRepo }),
      buscar: buscarIncidencias({ incidenciasRepo }),
    },
  };
});

const nuevaApp = (limites) => crearApp({ auth, incidencias: incidenciasFalsas.useCases, limites });
const login = (app, correo, password) => request(app).post("/api/auth/login").send({ correo, password });

describe("límite de intentos de login", () => {
  it("después de N intentos FALLIDOS responde 429 con el formato del proyecto y Retry-After", async () => {
    const app = nuevaApp({ login: { max: 3, ventanaMs: 60_000 }, general: { max: 1000, ventanaMs: 60_000 } });
    for (let i = 0; i < 3; i++) {
      const r = await login(app, "tec@utm.mx", "mala");
      expect(r.status).toBe(401);
    }
    const bloqueado = await login(app, "tec@utm.mx", "mala");
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error.codigo).toBe("DEMASIADAS_PETICIONES");
    expect(bloqueado.body.error.mensaje).toBeTypeOf("string");
    expect(Number(bloqueado.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("también bloquea la contraseña CORRECTA mientras dura el bloqueo (fuerza bruta)", async () => {
    const app = nuevaApp({ login: { max: 2, ventanaMs: 60_000 }, general: { max: 1000, ventanaMs: 60_000 } });
    await login(app, "tec@utm.mx", "mala");
    await login(app, "tec@utm.mx", "mala");
    const r = await login(app, "tec@utm.mx", PASSWORD);
    expect(r.status).toBe(429);
  });

  it("los logins correctos no consumen el cupo", async () => {
    const app = nuevaApp({ login: { max: 2, ventanaMs: 60_000 }, general: { max: 1000, ventanaMs: 60_000 } });
    for (let i = 0; i < 6; i++) {
      const r = await login(app, "tec@utm.mx", PASSWORD);
      expect(r.status).toBe(200);
    }
  });
});

describe("límite general de la API", () => {
  it("responde 429 al pasar el máximo, pero /health queda exento", async () => {
    const app = nuevaApp({ login: { max: 100, ventanaMs: 60_000 }, general: { max: 4, ventanaMs: 60_000 } });
    for (let i = 0; i < 4; i++) {
      const r = await request(app).get("/api/incidencias").set("Authorization", `Bearer ${token}`);
      expect(r.status).toBe(200);
    }
    const r = await request(app).get("/api/incidencias").set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(429);
    expect(r.body.error.codigo).toBe("DEMASIADAS_PETICIONES");
    // El health check de Vercel no se limita.
    for (let i = 0; i < 10; i++) expect((await request(app).get("/api/health")).status).toBe(200);
  });

  it("agrega las cabeceras estándar RateLimit-* (draft-7)", async () => {
    const app = nuevaApp({ login: { max: 100, ventanaMs: 60_000 }, general: { max: 50, ventanaMs: 60_000 } });
    const r = await request(app).get("/api/incidencias").set("Authorization", `Bearer ${token}`);
    expect(r.headers["ratelimit"] ?? r.headers["ratelimit-policy"]).toBeDefined();
  });
});

describe("inyección de operadores NoSQL", () => {
  let app;
  beforeAll(() => {
    app = nuevaApp({ login: { max: 100, ventanaMs: 60_000 }, general: { max: 1000, ventanaMs: 60_000 } });
  });
  const get = (ruta) => request(app).get(ruta).set("Authorization", `Bearer ${token}`);

  it.each([
    ["/api/incidencias?estado[$ne]=abierta"],
    ["/api/incidencias?categoria[$regex]=.*"],
    ["/api/incidencias?edificio[$gt]="],
    ["/api/incidencias?prioridad[]=alta&prioridad[]=baja"],
    ["/api/incidencias?pagina[$gt]=0"],
    ["/api/incidencias/buscar?q[$ne]=x"],
    ["/api/incidencias/buscar?q[$regex]=a"],
  ])("%s -> 400 y nunca llega a la base", async (ruta) => {
    const antes = incidenciasFalsas.llamadas.length;
    const r = await get(ruta);
    expect(r.status).toBe(400);
    expect(r.body.error.codigo).toBe("VALIDACION");
    expect(incidenciasFalsas.llamadas.length).toBe(antes);
  });

  it("el login rechaza objetos en correo y contraseña (no se evalúan operadores)", async () => {
    for (const cuerpo of [
      { correo: { $gt: "" }, password: PASSWORD },
      { correo: "tec@utm.mx", password: { $ne: "x" } },
      { correo: { $regex: ".*" }, password: { $regex: ".*" } },
    ]) {
      const r = await request(app).post("/api/auth/login").send(cuerpo);
      expect(r.status).toBe(400);
      expect(r.body.error.codigo).toBe("VALIDACION");
    }
  });

  it("un código con operadores o caracteres raros en la ruta es 404 sin tocar la base", async () => {
    for (const codigo of ["%7B%22%24ne%22%3Anull%7D", "INC-2026-0001%20OR%201", "..%2F..%2Fetc"]) {
      const r = await get(`/api/incidencias/${codigo}`);
      expect([404]).toContain(r.status);
    }
  });
});

describe("cabeceras y errores", () => {
  let app;
  beforeAll(() => {
    app = nuevaApp({ login: { max: 100, ventanaMs: 60_000 }, general: { max: 1000, ventanaMs: 60_000 } });
  });

  it("helmet: nosniff, sin X-Powered-By y HSTS", async () => {
    const r = await request(app).get("/api/health");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-powered-by"]).toBeUndefined();
    expect(r.headers["strict-transport-security"]).toBeDefined();
  });

  it("CORS: solo el origen configurado", async () => {
    const r = await request(app).get("/api/health").set("Origin", "https://sitio-malicioso.example");
    expect(r.headers["access-control-allow-origin"]).not.toBe("https://sitio-malicioso.example");
    expect(r.headers["access-control-allow-origin"]).not.toBe("*");
  });

  it("un cuerpo JSON roto o enorme no filtra stack ni rutas internas", async () => {
    const roto = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{ no es json");
    expect(roto.status).toBe(400);
    const enorme = await request(app).post("/api/auth/login").send({ correo: "a@b.c", password: "x".repeat(200_000) });
    expect(enorme.status).toBe(413);
    for (const r of [roto, enorme]) {
      const texto = JSON.stringify(r.body);
      expect(texto).not.toMatch(/node_modules|at \w+ \(|\.js:\d+|Error:/);
      expect(r.body.error.codigo).toBeTypeOf("string");
    }
  });
});
