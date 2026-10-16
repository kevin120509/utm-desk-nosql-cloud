// Pruebas HTTP de login, /me y roles con la app inyectada con fakes.
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";
import { requiereRol } from "../../src/interface/http/middlewares/roles.js";
import { crearAutenticacion } from "../../src/interface/http/middlewares/autenticacion.js";
import { manejadorErrores } from "../../src/interface/http/middlewares/errores.js";

// Secretos y contraseñas generados al vuelo.
const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const PASSWORD = "clave-" + Math.random().toString(36).slice(2);
let app;
let appRoles;

beforeAll(async () => {
  const hash = await bcrypt.hash(PASSWORD, 4);
  const usuarios = [
    { _id: "u1", nombre: "Ana", correo: "ana@utm.mx", rol: "reportante", tipo: "docente", password_hash: hash, activo: true },
    { _id: "u2", nombre: "Luis", correo: "luis@utm.mx", rol: "tecnico", password_hash: hash, activo: true },
  ];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const hasher = { comparar: (p, h) => bcrypt.compare(p, h) };
  const tokens = crearTokens({ secret: SECRET, expiresIn: "1h" });
  const auth = autenticar({ usuariosRepo, hasher, tokens });

  app = crearApp({ auth });

  // Mini app con una ruta de prueba protegida por rol.
  appRoles = express();
  appRoles.get("/solo-tecnicos", crearAutenticacion(auth), requiereRol("tecnico", "coordinador"), (_req, res) =>
    res.json({ ok: true }),
  );
  appRoles.use(manejadorErrores);
});

// Todo error debe tener { error: { codigo, mensaje } } y no filtrar internos.
function verificaFormato(res) {
  expect(res.body.error.codigo).toBeTypeOf("string");
  expect(res.body.error.mensaje).toBeTypeOf("string");
  expect(JSON.stringify(res.body)).not.toMatch(/stack|node_modules|password_hash/);
}

const login = (correo) => request(app).post("/api/auth/login").send({ correo, password: PASSWORD });

describe("POST /api/auth/login", () => {
  it("200 con { token, usuario }", async () => {
    const res = await login("ana@utm.mx");
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.usuario).toEqual({ id: "u1", nombre: "Ana", correo: "ana@utm.mx", rol: "reportante", tipo: "docente" });
    expect(JSON.stringify(res.body)).not.toContain("password_hash");
  });

  it("400 VALIDACION con cuerpo inválido y detalles por campo", async () => {
    const res = await request(app).post("/api/auth/login").send({ correo: "no-es-correo" });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("VALIDACION");
    expect(res.body.error.detalles).toBeDefined();
    verificaFormato(res);
  });

  it("400 con JSON malformado", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{mal");
    expect(res.status).toBe(400);
    verificaFormato(res);
  });

  it("401 con contraseña incorrecta", async () => {
    const res = await request(app).post("/api/auth/login").send({ correo: "ana@utm.mx", password: "otra" });
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("CREDENCIALES_INVALIDAS");
    verificaFormato(res);
  });
});

describe("GET /api/auth/me", () => {
  it("200 con token válido", async () => {
    const { body } = await login("luis@utm.mx");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.usuario.correo).toBe("luis@utm.mx");
    expect(res.body.usuario.rol).toBe("tecnico");
  });

  it("401 sin token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTENTICADO");
    verificaFormato(res);
  });

  it("401 con token mal formado", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer abc.def");
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTENTICADO");
  });

  it("401 con esquema distinto de Bearer", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Basic abc");
    expect(res.status).toBe(401);
  });

  it("401 con token expirado", async () => {
    const expirado = jwt.sign({ sub: "u1", rol: "reportante", nombre: "Ana" }, SECRET, { expiresIn: -10 });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expirado}`);
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTENTICADO");
    verificaFormato(res);
  });
});

describe("requiereRol", () => {
  it("403 SIN_PERMISO si el rol no está permitido", async () => {
    const { body } = await login("ana@utm.mx");
    const res = await request(appRoles).get("/solo-tecnicos").set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe("SIN_PERMISO");
    verificaFormato(res);
  });

  it("200 si el rol está permitido", async () => {
    const { body } = await login("luis@utm.mx");
    const res = await request(appRoles).get("/solo-tecnicos").set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(200);
  });

  it("401 sin token en ruta protegida", async () => {
    const res = await request(appRoles).get("/solo-tecnicos");
    expect(res.status).toBe(401);
  });
});
