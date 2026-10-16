import { describe, it, expect } from "vitest";
import request from "supertest";
import { crearApp } from "../src/interface/http/app.js";

describe("GET /api/health", () => {
  const app = crearApp();

  it("responde 200 con { ok: true }", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("devuelve 404 con el formato de error del proyecto en rutas desconocidas", async () => {
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe("NO_ENCONTRADO");
    expect(typeof res.body.error.mensaje).toBe("string");
  });
});
