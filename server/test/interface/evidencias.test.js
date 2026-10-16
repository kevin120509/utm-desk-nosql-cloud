// Pruebas HTTP de POST /api/incidencias/:codigo/evidencias (multipart) con fakes.
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { cargarEvidencia } from "../../src/application/cargarEvidencia.js";
import { obtenerIncidencia } from "../../src/application/consultarIncidencias.js";
import { detectarTipo } from "../../src/infrastructure/archivos/detectarTipo.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";
import { MAX_BYTES_EVIDENCIA } from "../../src/domain/index.js";
import { PNG, EXE } from "../fixtures/archivos.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const ids = { dueno: new ObjectId(), ajeno: new ObjectId(), tec: new ObjectId(), dir: new ObjectId() };

let app, tokens, almacen, evidenciasGuardadas;

const incidenciasRepo = {
  async buscarPorCodigo(codigo) {
    if (codigo !== "INC-2026-0001") return null;
    return {
      codigo,
      reportante: { usuario_id: ids.dueno },
      evidencias_adjuntas: evidenciasGuardadas,
    };
  },
  async agregarEvidencia(_c, ev) {
    evidenciasGuardadas.push(ev);
    return true;
  },
};

beforeAll(async () => {
  const hash = await bcrypt.hash("x" + Math.random(), 4);
  const mk = (_id, rol) => ({ _id, nombre: rol, correo: `${rol}${_id}@utm.mx`, rol, password_hash: hash, activo: true });
  const usuarios = [mk(ids.dueno, "reportante"), mk(ids.ajeno, "reportante"), mk(ids.tec, "tecnico"), mk(ids.dir, "directivo")];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  const t = crearTokens({ secret: SECRET, expiresIn: "1h" });
  const auth = autenticar({ usuariosRepo, hasher: { comparar: bcrypt.compare }, tokens: t });
  tokens = {
    dueno: t.firmar({ sub: String(ids.dueno), rol: "reportante", nombre: "d" }),
    ajeno: t.firmar({ sub: String(ids.ajeno), rol: "reportante", nombre: "a" }),
    tec: t.firmar({ sub: String(ids.tec), rol: "tecnico", nombre: "t" }),
    dir: t.firmar({ sub: String(ids.dir), rol: "directivo", nombre: "x" }),
  };
  almacen = {
    subir: vi.fn(async () => {}),
    urlFirmada: vi.fn(async (ruta) => ({ url: `https://nueva-firma/${ruta}`, expira: new Date("2030-01-01T00:00:00Z") })),
    eliminarArchivos: vi.fn(async () => {}),
  };
  app = crearApp({
    auth,
    incidencias: {
      registrar: async () => ({}),
      listar: async () => ({}),
      obtener: obtenerIncidencia({ incidenciasRepo, almacen, ttlSegundos: 60 }),
    },
    evidencias: { cargar: cargarEvidencia({ incidenciasRepo, almacen, detectarTipo }) },
  });
});

beforeEach(() => {
  evidenciasGuardadas = [];
  almacen.subir.mockClear();
});

const post = (token, codigo = "INC-2026-0001") => {
  const r = request(app).post(`/api/incidencias/${codigo}/evidencias`);
  return token ? r.set("Authorization", `Bearer ${token}`) : r;
};

describe("POST /api/incidencias/:codigo/evidencias", () => {
  it("201 con la evidencia (técnico)", async () => {
    const res = await post(tokens.tec).attach("archivo", PNG, "switch lc2.png");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre_archivo: "switch-lc2.png", tipo_mime: "image/png" });
    expect(res.body.storage_path).toMatch(/^INC-2026-0001\/[0-9a-f-]{36}-switch-lc2\.png$/);
    expect(almacen.subir).toHaveBeenCalledTimes(1);
    expect(evidenciasGuardadas).toHaveLength(1);
  });

  it("201 para el reportante dueño", async () => {
    const res = await post(tokens.dueno).attach("archivo", PNG, "evidencia.png");
    expect(res.status).toBe(201);
  });

  it("400 ARCHIVO_INVALIDO para un ejecutable renombrado, sin subir nada", async () => {
    const res = await post(tokens.tec).attach("archivo", EXE, "virus.png");
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("ARCHIVO_INVALIDO");
    expect(almacen.subir).not.toHaveBeenCalled();
  });

  it("400 si el archivo supera 4 MB", async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(MAX_BYTES_EVIDENCIA + 10)]);
    const res = await post(tokens.tec).attach("archivo", grande, "grande.png");
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("ARCHIVO_INVALIDO");
    expect(almacen.subir).not.toHaveBeenCalled();
  });

  it("400 si no viene archivo o viene en un campo con otro nombre", async () => {
    const sin = await post(tokens.tec).field("nota", "hola");
    expect(sin.status).toBe(400);
    const otro = await post(tokens.tec).attach("foto", PNG, "x.png");
    expect(otro.status).toBe(400);
    expect(otro.body.error.codigo).toBe("ARCHIVO_INVALIDO");
  });

  it("401 sin token, 403 reportante ajeno y directivo, 404 incidencia inexistente", async () => {
    expect((await post(null).attach("archivo", PNG, "x.png")).status).toBe(401);
    expect((await post(tokens.ajeno).attach("archivo", PNG, "x.png")).status).toBe(403);
    expect((await post(tokens.dir).attach("archivo", PNG, "x.png")).status).toBe(403);
    const r404 = await post(tokens.tec, "INC-2026-9999").attach("archivo", PNG, "x.png");
    expect(r404.status).toBe(404);
    expect(r404.body.error.codigo).toBe("NO_ENCONTRADO");
    expect(almacen.subir).not.toHaveBeenCalled();
  });
});

describe("GET /api/incidencias/:codigo regenera las URLs firmadas", () => {
  it("la respuesta trae URLs nuevas desde storage_path y no toca lo guardado", async () => {
    evidenciasGuardadas.push({
      nombre_archivo: "a.png",
      tipo_mime: "image/png",
      peso_kb: 1,
      storage_path: "INC-2026-0001/abc-a.png",
      url_storage: "https://vieja-expirada",
      url_expira: new Date("2020-01-01T00:00:00Z"),
      fecha_carga: new Date("2020-01-01T00:00:00Z"),
    });
    const res = await request(app).get("/api/incidencias/INC-2026-0001").set("Authorization", `Bearer ${tokens.tec}`);
    expect(res.status).toBe(200);
    expect(res.body.evidencias_adjuntas[0].url_storage).toBe("https://nueva-firma/INC-2026-0001/abc-a.png");
    expect(res.body.evidencias_adjuntas[0].url_expira).toBe("2030-01-01T00:00:00.000Z");
    // Lo "guardado" sigue con la URL vieja: la regeneración es solo de lectura.
    expect(evidenciasGuardadas[0].url_storage).toBe("https://vieja-expirada");
  });

  it("si el almacén falla, el expediente se devuelve igual con la URL guardada", async () => {
    evidenciasGuardadas.push({ nombre_archivo: "a.png", storage_path: "INC-2026-0001/x.png", url_storage: "https://guardada" });
    almacen.urlFirmada.mockRejectedValueOnce(new Error("sin red"));
    const res = await request(app).get("/api/incidencias/INC-2026-0001").set("Authorization", `Bearer ${tokens.tec}`);
    expect(res.status).toBe(200);
    expect(res.body.evidencias_adjuntas[0].url_storage).toBe("https://guardada");
  });
});
