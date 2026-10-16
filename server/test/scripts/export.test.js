// B15: entregables de BD. El script maestro generado se EJECUTA de verdad contra Atlas
// (con un intérprete mínimo de las funciones de mongosh que usa) en colecciones temporales.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient, ObjectId } from "mongodb";
import { aJsonExtendido, aLiteralMongosh, sinTokensEnUrls } from "../../scripts/export/serializar.js";
import { generarScriptMaestro } from "../../scripts/export/scriptMaestro.js";
import { USUARIOS_DEMO, construirDatos, evidenciasFalsas } from "../../scripts/seed/datos.js";
import { crearMuestras } from "../../scripts/seed/archivosMuestra.js";
import { verificarConjunto } from "../../scripts/seed/verificar.js";
import { validadorIncidencias } from "../../src/infrastructure/mongo/validador.js";
import { indicesIncidencias, indicesUsuarios } from "../../src/infrastructure/mongo/indices.js";

const AHORA = new Date("2026-10-15T18:00:00Z");

function datosDemo() {
  const usuarios = Object.fromEntries(USUARIOS_DEMO.map((u) => [u.clave, { ...u, _id: new ObjectId() }]));
  const { incidencias, planEvidencias } = construirDatos({ ahora: AHORA, usuarios });
  evidenciasFalsas(incidencias, planEvidencias, crearMuestras());
  return incidencias;
}

describe("serializadores", () => {
  it("JSON extendido: ObjectId -> $oid y Date -> $date, anidado", () => {
    const id = new ObjectId();
    const fecha = new Date("2026-10-15T12:00:00Z");
    const r = aJsonExtendido({ _id: id, a: [{ f: fecha }], n: 3, s: "x" });
    expect(r).toEqual({ _id: { $oid: id.toString() }, a: [{ f: { $date: "2026-10-15T12:00:00.000Z" } }], n: 3, s: "x" });
    expect(JSON.parse(JSON.stringify(r))).toEqual(r); // es JSON puro
  });

  it("literal de mongosh: ObjectId(...) e ISODate(...), claves con punto entre comillas", () => {
    const id = new ObjectId();
    const txt = aLiteralMongosh({ _id: id, "ubicacion.edificio": 1, f: new Date("2026-10-15T12:00:00Z"), t: ["a", "b"] });
    expect(txt).toContain(`ObjectId("${id}")`);
    expect(txt).toContain('ISODate("2026-10-15T12:00:00.000Z")');
    expect(txt).toContain('"ubicacion.edificio": 1');
    expect(txt).toContain('t: ["a", "b"]');
  });
});

describe("sinTokensEnUrls", () => {
  it("quita el token de url_storage sin mutar el original", () => {
    const original = [
      { codigo: "INC-2026-0001", evidencias_adjuntas: [{ storage_path: "a/b.png", url_storage: "https://x.supabase.co/storage/v1/object/sign/evidencias/a/b.png?token=SECRETO" }] },
      { codigo: "INC-2026-0002", evidencias_adjuntas: [] },
    ];
    const r = sinTokensEnUrls(original);
    expect(r[0].evidencias_adjuntas[0].url_storage).toBe("https://x.supabase.co/storage/v1/object/sign/evidencias/a/b.png");
    expect(JSON.stringify(r)).not.toContain("SECRETO");
    expect(r[1].evidencias_adjuntas).toEqual([]);
    expect(original[0].evidencias_adjuntas[0].url_storage).toContain("token=SECRETO");
  });
});

describe("generarScriptMaestro", () => {
  const incidencias = datosDemo();
  const script = generarScriptMaestro({
    incidencias,
    validador: validadorIncidencias,
    indicesIncidencias,
    indicesUsuarios,
    generadoEn: AHORA,
  });

  it("incluye validador, los índices obligatorios, los datos y las consultas del enunciado", () => {
    expect(script).toContain('bd.createCollection("incidencias_campus"');
    expect(script).toContain("$jsonSchema");
    for (const i of indicesIncidencias) expect(script).toContain(`name: "${i.name}"`);
    expect(script).toContain("expireAfterSeconds: 5184000");
    expect(script).toContain('default_language: "spanish"');
    expect(script).toContain("insertMany");
    for (const op of ["$text", "$unwind", "$dateDiff", "$addToSet", "$pull", "$push", "$inc", "$set"]) {
      expect(script).toContain(op);
    }
    expect(script).toContain("INC-2026-0001");
  });

  it("no exporta contraseñas ni hashes", () => {
    expect(script).not.toMatch(/password_hash|\$2[aby]\$/);
  });

  it("es JavaScript sintácticamente válido", () => {
    expect(() => new Function("db", "ObjectId", "ISODate", "print", "printjson", script)).not.toThrow();
  });
});

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

// Intérprete mínimo de mongosh: cada llamada del script se encola y luego se ejecuta en orden
// con el driver real. Basta para createCollection, createIndex, insertMany, find/aggregate.
function ejecutarScriptEnAtlas(texto, db) {
  const cola = [];
  const encolar = (fn) => cola.push(fn);
  const cursorFalso = (obtener) => {
    const c = { sort: () => c, limit: () => c, toArray: () => (encolar(obtener), []) };
    return c;
  };
  const coleccion = (nombre) => ({
    createIndex: (key, opciones) => encolar(() => db.collection(nombre).createIndex(key, opciones)),
    insertMany: (docs) => encolar(() => db.collection(nombre).insertMany(docs)),
    countDocuments: (f) => (encolar(() => db.collection(nombre).countDocuments(f)), 0),
    find: (f, p) => cursorFalso(() => db.collection(nombre).find(f, { projection: p }).toArray()),
    aggregate: (pipeline) => cursorFalso(() => db.collection(nombre).aggregate(pipeline).toArray()),
    updateOne: () => {
      throw new Error("el script no debe modificar datos fuera de los comentarios");
    },
  });
  const bd = new Proxy(
    {},
    {
      get: (_, prop) =>
        prop === "createCollection"
          ? (nombre, opciones) => encolar(() => db.createCollection(nombre, opciones))
          : coleccion(prop),
    },
  );
  const sinEfecto = () => {};
  const iso = (s) => new Date(s);
  new Function("db", "ObjectId", "ISODate", "print", "printjson", texto)(
    { getSiblingDB: () => bd },
    (hex) => new ObjectId(hex),
    iso,
    sinEfecto,
    sinEfecto,
  );
  return async () => {
    for (const paso of cola) await paso();
  };
}

describe.skipIf(!hayEntorno)("el script maestro reproduce la base en Atlas (colecciones temporales)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const inc = `incidencias_campus_test_${sufijo}`;
  const usr = `usuarios_test_${sufijo}`;
  let client, db;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
  }, 60000);

  afterAll(async () => {
    for (const n of [inc, usr]) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("crea colección, índices y datos; el validador sigue activo", async () => {
    const original = datosDemo();
    let script = generarScriptMaestro({
      incidencias: original,
      validador: validadorIncidencias,
      indicesIncidencias,
      indicesUsuarios,
      nombreBd: db.databaseName,
      generadoEn: AHORA,
    });
    // Se redirige a colecciones temporales para no tocar las reales.
    script = script.split("incidencias_campus").join(inc).split("usuarios").join(usr);

    const correr = ejecutarScriptEnAtlas(script, db);
    await correr();

    const col = db.collection(inc);
    const leidas = await col.find({}).sort({ fecha_creacion: 1 }).toArray();
    expect(leidas).toHaveLength(24);
    expect(verificarConjunto(leidas, { ahora: AHORA }).filter((r) => !r.ok)).toEqual([]);

    const nombres = (await col.indexes()).map((i) => i.name).sort();
    expect(nombres).toEqual(["_id_", ...indicesIncidencias.map((i) => i.name)].sort());
    const ttl = (await col.indexes()).find((i) => i.name === "idx_ttl_resolucion");
    expect(ttl.expireAfterSeconds).toBe(5_184_000);

    // Validador activo: un documento inválido es rechazado (121).
    await expect(col.insertOne({ codigo: "no-valido" })).rejects.toMatchObject({ code: 121 });
    // Y el índice de usuarios existe.
    expect((await db.collection(usr).indexes()).map((i) => i.name)).toContain("idx_correo_unico");
  }, 120000);
});
