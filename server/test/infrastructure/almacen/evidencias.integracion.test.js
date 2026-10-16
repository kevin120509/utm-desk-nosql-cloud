// Integración REAL: Supabase Storage (bucket privado) + Atlas (colección temporal).
// Sube un PNG, comprueba la URL firmada, el $push y que un archivo inválido no deja objetos.
// Al final borra los objetos de prueba del bucket y la colección temporal.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";
import { ContadorMongo } from "../../../src/infrastructure/mongo/contadorMongo.js";
import { UsuariosRepoMongo } from "../../../src/infrastructure/mongo/usuariosRepo.js";
import { AlmacenSupabase } from "../../../src/infrastructure/almacen/almacenSupabase.js";
import { detectarTipo } from "../../../src/infrastructure/archivos/detectarTipo.js";
import { registrarIncidencia } from "../../../src/application/registrarIncidencia.js";
import { cargarEvidencia } from "../../../src/application/cargarEvidencia.js";
import { obtenerIncidencia } from "../../../src/application/consultarIncidencias.js";
import { eliminarIncidencia } from "../../../src/application/eliminarIncidencia.js";
import { PNG, PDF, EXE } from "../../fixtures/archivos.js";

const hayEntorno = Boolean(
  process.env.MONGODB_URI &&
    process.env.MONGODB_DB &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!hayEntorno)("evidencias (Supabase + Atlas reales)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = {
    inc: `incidencias_campus_test_${sufijo}`,
    usr: `usuarios_test_${sufijo}`,
    cont: `contadores_test_${sufijo}`,
  };
  let client, db, colInc, almacen, sesion, codigo, cargar, obtener, rutasSubidas;

  async function listarObjetos(prefijo) {
    const { data, error } = await almacen.cliente.storage.from(almacen.bucket).list(prefijo);
    if (error) throw error;
    return data.map((o) => o.name);
  }

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, { coleccionIncidencias: nombres.inc, coleccionUsuarios: nombres.usr });

    almacen = new AlmacenSupabase({
      url: process.env.SUPABASE_URL,
      claveSecreta: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: process.env.SUPABASE_BUCKET || "evidencias",
    });

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
    const incidenciasRepo = new IncidenciasRepoMongo(colInc);
    const registrar = registrarIncidencia({
      incidenciasRepo,
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
    // Prefijo propio de la prueba: el código es único por colección temporal, pero el bucket es
    // compartido, así que se agrega el sufijo al código real usando una ruta distinta abajo.
    codigo = creada.codigo;
    cargar = cargarEvidencia({ incidenciasRepo, almacen, detectarTipo, ttlSegundos: 120 });
    obtener = obtenerIncidencia({ incidenciasRepo, almacen, ttlSegundos: 120 });
    rutasSubidas = [];
  }, 120000);

  afterAll(async () => {
    // Limpieza: objetos de prueba del bucket y colecciones temporales.
    try {
      if (rutasSubidas?.length) await almacen.eliminarArchivos(rutasSubidas);
    } catch (e) {
      console.error("limpieza del bucket falló:", e.message);
    }
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("sube un PNG, guarda los metadatos con $push y la URL firmada devuelve el mismo contenido", async () => {
    const ev = await cargar(sesion, codigo, { originalname: "Switch LC-2.png", buffer: PNG, size: PNG.length });
    rutasSubidas.push(ev.storage_path);

    expect(ev.tipo_mime).toBe("image/png");
    expect(ev.storage_path.startsWith(`${codigo}/`)).toBe(true);
    expect(ev.url_expira.getTime()).toBeGreaterThan(Date.now());

    // $push visible en Mongo y el documento sigue pasando el $jsonSchema.
    const doc = await colInc.findOne({ codigo });
    expect(doc.evidencias_adjuntas).toHaveLength(1);
    expect(doc.evidencias_adjuntas[0].storage_path).toBe(ev.storage_path);
    expect(JSON.stringify(doc)).not.toContain("null");

    // La URL firmada funciona (el bucket es privado) y entrega los mismos bytes.
    const respuesta = await fetch(ev.url_storage);
    expect(respuesta.status).toBe(200);
    expect(Buffer.from(await respuesta.arrayBuffer()).equals(PNG)).toBe(true);
  }, 90000);

  it("el bucket es privado: la URL pública sin firma no funciona", async () => {
    const doc = await colInc.findOne({ codigo });
    const ruta = doc.evidencias_adjuntas[0].storage_path;
    const publica = `${process.env.SUPABASE_URL}/storage/v1/object/public/${almacen.bucket}/${ruta}`;
    const r = await fetch(publica);
    expect(r.status).toBeGreaterThanOrEqual(400);
  }, 60000);

  it("un archivo inválido no deja objetos en el bucket ni toca Mongo", async () => {
    const antes = await listarObjetos(codigo);
    const evidenciasAntes = (await colInc.findOne({ codigo })).evidencias_adjuntas.length;
    await expect(cargar(sesion, codigo, { originalname: "virus.png", buffer: EXE, size: EXE.length })).rejects.toMatchObject({
      codigo: "ARCHIVO_INVALIDO",
    });
    expect(await listarObjetos(codigo)).toEqual(antes);
    expect((await colInc.findOne({ codigo })).evidencias_adjuntas.length).toBe(evidenciasAntes);
  }, 60000);

  it("al leer el expediente regenera la URL firmada desde storage_path", async () => {
    // Simula una URL vieja guardada en Mongo.
    await colInc.updateOne({ codigo }, { $set: { "evidencias_adjuntas.0.url_storage": "https://expirada.invalid/x" } });
    const doc = await obtener(sesion, codigo);
    const url = doc.evidencias_adjuntas[0].url_storage;
    expect(url).not.toContain("expirada.invalid");
    const r = await fetch(url);
    expect(r.status).toBe(200);
  }, 60000);

  it("sube un PDF y al borrar la incidencia se eliminan sus archivos del bucket", async () => {
    const ev = await cargar(sesion, codigo, { originalname: "diagnostico.pdf", buffer: PDF, size: PDF.length });
    rutasSubidas.push(ev.storage_path);
    expect(ev.tipo_mime).toBe("application/pdf");
    expect((await listarObjetos(codigo)).length).toBe(2);

    const eliminar = eliminarIncidencia({ incidenciasRepo: new IncidenciasRepoMongo(colInc), almacen });
    await eliminar({ id: sesion.id, rol: "coordinador" }, codigo);

    expect(await colInc.findOne({ codigo })).toBeNull();
    expect(await listarObjetos(codigo)).toEqual([]);
    rutasSubidas = []; // ya no quedan objetos que limpiar
  }, 90000);
});
