// B14: documentos de la demostración del TTL. La espera real del barrido (~1 min) se prueba
// con `npm run demo:ttl`; aquí se valida lo determinista: fechas, esquema e índice.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import { construirDocumentosTtl, DIAS_VIEJO, DIAS_RECIENTE } from "../../scripts/seed/ttl.js";
import { configurarBaseDeDatos } from "../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { indicesIncidencias } from "../../src/infrastructure/mongo/indices.js";

const AHORA = new Date("2026-10-15T18:00:00Z");
const MS_DIA = 86_400_000;

describe("documentos de la demostración del TTL", () => {
  const { viejo, reciente } = construirDocumentosTtl(AHORA);

  it("uno resuelto hace 61 días y otro hace 59, con códigos reservados distintos", () => {
    expect(DIAS_VIEJO).toBe(61);
    expect(DIAS_RECIENTE).toBe(59);
    expect((AHORA - viejo.fecha_resolucion) / MS_DIA).toBe(61);
    expect((AHORA - reciente.fecha_resolucion) / MS_DIA).toBe(59);
    expect(viejo.codigo).toBe("INC-2026-9061");
    expect(reciente.codigo).toBe("INC-2026-9059");
  });

  it("el TTL del índice (60 días) queda entre las dos fechas", () => {
    const ttl = indicesIncidencias.find((i) => i.name === "idx_ttl_resolucion").expireAfterSeconds;
    expect(ttl).toBe(60 * 86_400);
    expect((AHORA - viejo.fecha_resolucion) / 1000).toBeGreaterThan(ttl);
    expect((AHORA - reciente.fecha_resolucion) / 1000).toBeLessThan(ttl);
  });

  it("son resueltas, con fecha_resolucion Date y sin campos null", () => {
    for (const d of [viejo, reciente]) {
      expect(d.estado).toBe("resuelta");
      expect(d.fecha_resolucion).toBeInstanceOf(Date);
      expect(d.fecha_creacion.getTime()).toBeLessThan(d.fecha_resolucion.getTime());
      expect(JSON.stringify(d)).not.toContain("null");
      expect(d.horas_invertidas).toBe(d.historial_seguimiento.reduce((s, h) => s + h.horas, 0));
    }
  });
});

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

describe.skipIf(!hayEntorno)("documentos TTL contra el validador real de Atlas", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = { coleccionIncidencias: `incidencias_campus_test_${sufijo}`, coleccionUsuarios: `usuarios_test_${sufijo}` };
  let client, db;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, nombres);
  }, 90000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("ambos documentos pasan el $jsonSchema y la colección tiene el índice TTL de 60 días", async () => {
    const col = db.collection(nombres.coleccionIncidencias);
    const { viejo, reciente } = construirDocumentosTtl(new Date());
    const r = await col.insertMany([viejo, reciente]);
    expect(r.insertedCount).toBe(2);
    const ttl = (await col.indexes()).find((i) => i.name === "idx_ttl_resolucion");
    expect(ttl.expireAfterSeconds).toBe(5_184_000);
    expect(ttl.key).toEqual({ fecha_resolucion: 1 });
  }, 90000);
});
