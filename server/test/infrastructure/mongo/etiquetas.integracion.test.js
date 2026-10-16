// Integración con Atlas: $addToSet y $pull reales sobre una colección temporal.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";
import { EtiquetasRepoMongo } from "../../../src/infrastructure/mongo/etiquetasRepo.js";
import { ContadorMongo } from "../../../src/infrastructure/mongo/contadorMongo.js";
import { UsuariosRepoMongo } from "../../../src/infrastructure/mongo/usuariosRepo.js";
import { registrarIncidencia } from "../../../src/application/registrarIncidencia.js";
import { gestionarEtiquetas } from "../../../src/application/gestionarEtiquetas.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

describe.skipIf(!hayEntorno)("etiquetas (Atlas real)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = {
    inc: `incidencias_campus_test_${sufijo}`,
    usr: `usuarios_test_${sufijo}`,
    cont: `contadores_test_${sufijo}`,
  };
  let client, db, colInc, etiquetas, codigo, sesion;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, { coleccionIncidencias: nombres.inc, coleccionUsuarios: nombres.usr });
    const hash = await bcrypt.hash("t" + Math.random(), 4);
    const r = await db.collection(nombres.usr).insertOne({
      nombre: "Tec",
      correo: `tec_${sufijo}@utm.mx`,
      rol: "tecnico",
      password_hash: hash,
      activo: true,
    });
    sesion = { id: String(r.insertedId), rol: "tecnico", nombre: "Tec" };
    colInc = db.collection(nombres.inc);
    const registrar = registrarIncidencia({
      incidenciasRepo: new IncidenciasRepoMongo(colInc),
      contador: new ContadorMongo(db.collection(nombres.cont)),
      usuariosRepo: new UsuariosRepoMongo(db.collection(nombres.usr)),
    });
    const creada = await registrar(sesion, {
      titulo: "Switch del laboratorio sin respuesta",
      descripcion: "Desde las 8:00 los equipos no obtienen red.",
      prioridad: "alta",
      ubicacion: { edificio: "Laboratorios de Cómputo", espacio: "LC-2" },
      categoria: "computo_redes",
      detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 28 },
    });
    codigo = creada.codigo;
    etiquetas = gestionarEtiquetas({ etiquetasRepo: new EtiquetasRepoMongo(colInc) });
  }, 120000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("dos altas del mismo tag con distinto formato dejan UNA etiqueta", async () => {
    await etiquetas.agregar(sesion, codigo, { tag: "Switch " });
    const r = await etiquetas.agregar(sesion, codigo, { tag: "switch" });
    expect(r.tags).toEqual(["switch"]);
    const doc = await colInc.findOne({ codigo });
    expect(doc.tags).toEqual(["switch"]);
  });

  it("agregar varias, quitar una con $pull y quitar una inexistente no falla", async () => {
    await etiquetas.agregar(sesion, codigo, { tag: "sin-red" });
    await etiquetas.agregar(sesion, codigo, { tag: "laboratorio" });
    expect((await etiquetas.quitar(sesion, codigo, "sin-red")).tags.sort()).toEqual(["laboratorio", "switch"]);
    expect((await etiquetas.quitar(sesion, codigo, "no-existe")).tags.sort()).toEqual(["laboratorio", "switch"]);
  });

  it("actualiza fecha_actualizacion y el documento sigue pasando el $jsonSchema", async () => {
    const antes = (await colInc.findOne({ codigo })).fecha_actualizacion;
    await new Promise((r) => setTimeout(r, 5));
    await etiquetas.agregar(sesion, codigo, { tag: "urgente" });
    const doc = await colInc.findOne({ codigo });
    expect(doc.fecha_actualizacion.getTime()).toBeGreaterThan(antes.getTime());
    // Si el validador no aceptara el documento, el update habría fallado (código 121).
    expect(new Set(doc.tags).size).toBe(doc.tags.length);
    expect(JSON.stringify(doc)).not.toContain("null");
  });

  it("incidencia inexistente -> NO_ENCONTRADO", async () => {
    await expect(etiquetas.agregar(sesion, "INC-2026-9999", { tag: "wifi" })).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await expect(etiquetas.quitar(sesion, "INC-2026-9999", "wifi")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });
});
