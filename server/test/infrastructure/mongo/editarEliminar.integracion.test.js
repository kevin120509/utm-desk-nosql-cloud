// Integración con Atlas: editar y eliminar incidencias (RF-12). Colecciones temporales que se eliminan al final.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";
import { ContadorMongo } from "../../../src/infrastructure/mongo/contadorMongo.js";
import { UsuariosRepoMongo } from "../../../src/infrastructure/mongo/usuariosRepo.js";
import { registrarIncidencia } from "../../../src/application/registrarIncidencia.js";
import { editarIncidencia } from "../../../src/application/editarIncidencia.js";
import { eliminarIncidencia } from "../../../src/application/eliminarIncidencia.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

const entrada = {
  titulo: "Switch del laboratorio sin respuesta",
  descripcion: "Desde las 8:00 los equipos no obtienen red.",
  prioridad: "alta",
  ubicacion: { edificio: "Laboratorios de Cómputo", piso: 1, espacio: "LC-2" },
  categoria: "computo_redes",
  detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 28 },
};

describe.skipIf(!hayEntorno)("editar y eliminar (Atlas real)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = { inc: `incidencias_campus_test_${sufijo}`, usr: `usuarios_test_${sufijo}`, cont: `contadores_test_${sufijo}` };
  const borrados = [];
  let client, db, colInc, registrar, editar, eliminar, rep, coord;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, { coleccionIncidencias: nombres.inc, coleccionUsuarios: nombres.usr });
    const hash = await bcrypt.hash("t" + Math.random(), 4);
    const crearUsuario = async (nombre, rol, extra = {}) => {
      const r = await db.collection(nombres.usr).insertOne({
        nombre, correo: `${rol}_${sufijo}@utm.mx`, rol, password_hash: hash, activo: true, ...extra,
      });
      return { id: String(r.insertedId), rol, nombre };
    };
    rep = await crearUsuario("Ana Prueba", "reportante", { tipo: "docente" });
    coord = await crearUsuario("Coord Prueba", "coordinador");
    colInc = db.collection(nombres.inc);
    const incidenciasRepo = new IncidenciasRepoMongo(colInc);
    const usuariosRepo = new UsuariosRepoMongo(db.collection(nombres.usr));
    registrar = registrarIncidencia({ incidenciasRepo, contador: new ContadorMongo(db.collection(nombres.cont)), usuariosRepo });
    editar = editarIncidencia({ incidenciasRepo });
    eliminar = eliminarIncidencia({
      incidenciasRepo,
      almacen: { eliminarArchivos: async (paths) => void borrados.push(...paths) },
    });
  }, 60000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("PATCH cambia título y prioridad, avanza fecha_actualizacion y cumple el $jsonSchema", async () => {
    const creada = await registrar(rep, entrada);
    await new Promise((r) => setTimeout(r, 20));
    const nueva = await editar(coord, creada.codigo, { titulo: "Switch corregido por coordinación", prioridad: "media" });
    expect(nueva.titulo).toBe("Switch corregido por coordinación");
    expect(nueva.prioridad).toBe("media");
    expect(nueva.fecha_actualizacion.getTime()).toBeGreaterThan(creada.fecha_actualizacion.getTime());
    expect(nueva.estado).toBe(creada.estado);
    // El $jsonSchema valida cada escritura: la ubicación completa también debe pasar.
    const conUbicacion = await editar(coord, creada.codigo, { ubicacion: { edificio: "Rectoría", piso: 2, espacio: "R-201" } });
    expect(conUbicacion.ubicacion.espacio).toBe("R-201");
  }, 60000);

  it("PATCH sobre inexistente da NO_ENCONTRADO", async () => {
    await expect(editar(coord, "INC-2026-9999", { titulo: "Titulo válido" })).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  }, 60000);

  it("DELETE elimina el documento y pasa los storage_path de las evidencias al almacén", async () => {
    const { codigo } = await registrar(rep, entrada);
    const ahora = new Date();
    const ev = (n) => ({
      nombre_archivo: `foto${n}.png`, tipo_mime: "image/png", peso_kb: 120,
      storage_path: `${codigo}/foto${n}.png`, url_storage: `https://ejemplo.test/${codigo}/foto${n}.png`,
      url_expira: new Date(ahora.getTime() + 3600_000), fecha_carga: ahora,
    });
    await colInc.updateOne({ codigo }, { $push: { evidencias_adjuntas: { $each: [ev(1), ev(2)] } } });

    const r = await eliminar(coord, codigo);
    expect(r).toEqual({ eliminada: true, codigo });
    expect(await colInc.findOne({ codigo })).toBeNull();
    expect(borrados).toEqual([`${codigo}/foto1.png`, `${codigo}/foto2.png`]);
  }, 60000);

  it("DELETE sobre inexistente da NO_ENCONTRADO", async () => {
    await expect(eliminar(coord, "INC-2026-9998")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  }, 60000);
});
