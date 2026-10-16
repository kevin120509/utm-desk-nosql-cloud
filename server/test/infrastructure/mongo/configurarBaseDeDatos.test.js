// configurarBaseDeDatos debe poder correr varias veces con el usuario de mínimo privilegio
// (readWrite): sin collMod cuando el validador ya está al día.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

describe.skipIf(!hayEntorno)("configurarBaseDeDatos es idempotente (Atlas real)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = { coleccionIncidencias: `incidencias_campus_test_${sufijo}`, coleccionUsuarios: `usuarios_test_${sufijo}` };
  let client, db;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
  }, 60000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("la primera vez crea y la segunda deja el validador al día sin collMod", async () => {
    const primera = await configurarBaseDeDatos(db, nombres);
    expect(primera.colecciones.find((c) => c.nombre === nombres.coleccionIncidencias).accion).toBe("creada");

    const segunda = await configurarBaseDeDatos(db, nombres);
    expect(segunda.colecciones.find((c) => c.nombre === nombres.coleccionIncidencias).accion).toBe("validador al día");
    expect(segunda.colecciones.find((c) => c.nombre === nombres.coleccionUsuarios).accion).toBe("ya existía");
  }, 90000);
});
