// Pruebas del contador: unitarias (claves) e integración contra Atlas con colección temporal.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { obtenerBaseDeDatos, cerrarCliente } from "../../../src/infrastructure/mongo/cliente.js";
import {
  ContadorMongo,
  claveDiaria,
  claveAnual,
} from "../../../src/infrastructure/mongo/contadorMongo.js";

describe("claveDiaria / claveAnual (sin BD)", () => {
  it("arma la clave diaria con la fecha local de Mérida", () => {
    expect(claveDiaria("computo_redes", new Date("2026-10-15T07:00:00Z"))).toBe(
      "contador:incidencias:2026-10-15:computo_redes"
    );
  });

  it("23:30 del 14 en Mérida (05:30Z del 15) cuenta como el día 14", () => {
    expect(claveDiaria("servicios_academicos", new Date("2026-10-15T05:30:00Z"))).toBe(
      "contador:incidencias:2026-10-14:servicios_academicos"
    );
  });

  it("arma la clave anual", () => {
    expect(claveAnual(2026)).toBe("contador:incidencias:anual:2026");
  });

  it("rechaza categoría inválida", () => {
    expect(() => claveDiaria("otra", new Date())).toThrow(/categor/i);
  });

  it("rechaza fecha inválida", () => {
    expect(() => claveDiaria("servicios_academicos", new Date("no es fecha"))).toThrow(/fecha/i);
    expect(() => claveDiaria("servicios_academicos", "2026-10-15")).toThrow(/fecha/i);
  });

  it("rechaza año que no sea entero de 4 dígitos", () => {
    expect(() => claveAnual(26)).toThrow(/a[ñn]o/i);
    expect(() => claveAnual(2026.5)).toThrow(/a[ñn]o/i);
    expect(() => claveAnual("2026")).toThrow(/a[ñn]o/i);
  });
});

describe("ContadorMongo (Atlas real)", () => {
  const nombreCol = `contadores_test_${randomBytes(4).toString("hex")}`;
  let db;
  let contador;

  beforeAll(async () => {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
      throw new Error("Faltan MONGODB_URI o MONGODB_DB en server/.env para correr estas pruebas");
    }
    db = await obtenerBaseDeDatos();
    contador = new ContadorMongo(db.collection(nombreCol));
  });

  afterAll(async () => {
    if (db) await db.collection(nombreCol).drop().catch(() => {});
    await cerrarCliente();
  });

  const ordenados = (arr) => [...arr].sort((a, b) => a - b);
  const de1a20 = Array.from({ length: 20 }, (_, i) => i + 1);

  it("20 llamadas paralelas al diario devuelven 1..20 sin repetir", async () => {
    const fecha = new Date("2026-10-15T15:00:00Z");
    const r = await Promise.all(de1a20.map(() => contador.siguienteDiario("computo_redes", fecha)));
    expect(ordenados(r)).toEqual(de1a20);
  });

  it("20 llamadas paralelas al anual devuelven 1..20 sin repetir", async () => {
    const r = await Promise.all(de1a20.map(() => contador.siguienteAnual(2026)));
    expect(ordenados(r)).toEqual(de1a20);
  });

  it("otra categoría u otro día reinician en 1", async () => {
    expect(await contador.siguienteDiario("infraestructura_fisica", new Date("2026-10-15T15:00:00Z"))).toBe(1);
    expect(await contador.siguienteDiario("computo_redes", new Date("2026-10-16T15:00:00Z"))).toBe(1);
    expect(await contador.siguienteAnual(2027)).toBe(1);
  });

  it("respeta la zona horaria de Mérida", async () => {
    // 05:30Z del 15 = día 14 local; 07:00Z del 15 = día 15 local.
    await contador.siguienteDiario("servicios_academicos", new Date("2026-10-15T05:30:00Z"));
    await contador.siguienteDiario("servicios_academicos", new Date("2026-10-15T07:00:00Z"));
    const col = db.collection(nombreCol);
    const d14 = await col.findOne({ _id: "contador:incidencias:2026-10-14:servicios_academicos" });
    const d15 = await col.findOne({ _id: "contador:incidencias:2026-10-15:servicios_academicos" });
    expect(d14.valor).toBe(1);
    expect(d15.valor).toBe(1);
  });

  it("categoría inválida y fecha inválida lanzan error claro", async () => {
    await expect(contador.siguienteDiario("otra", new Date())).rejects.toThrow(/categor/i);
    await expect(contador.siguienteDiario("servicios_academicos", new Date("x"))).rejects.toThrow(/fecha/i);
    await expect(contador.siguienteAnual("2026")).rejects.toThrow(/a[ñn]o/i);
  });
});
