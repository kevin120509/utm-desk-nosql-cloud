// Integración con Atlas: los dos pipelines sobre una colección temporal con datos calculados a mano.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";
import { AnaliticaRepoMongo } from "../../../src/infrastructure/mongo/analiticaRepo.js";
import { ContadorMongo } from "../../../src/infrastructure/mongo/contadorMongo.js";
import { UsuariosRepoMongo } from "../../../src/infrastructure/mongo/usuariosRepo.js";
import { registrarIncidencia } from "../../../src/application/registrarIncidencia.js";
import { consultarAnalitica } from "../../../src/application/consultarAnalitica.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);
const HORA = 3600 * 1000;

describe.skipIf(!hayEntorno)("analítica (Atlas real)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = {
    inc: `incidencias_campus_test_${sufijo}`,
    usr: `usuarios_test_${sufijo}`,
    cont: `contadores_test_${sufijo}`,
  };
  let client, db, colInc, analitica;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, { coleccionIncidencias: nombres.inc, coleccionUsuarios: nombres.usr });
    const hash = await bcrypt.hash("t" + Math.random(), 4);
    const r = await db.collection(nombres.usr).insertOne({
      nombre: "Rep", correo: `rep_${sufijo}@utm.mx`, rol: "reportante", password_hash: hash, activo: true,
    });
    const sesion = { id: String(r.insertedId), rol: "reportante", nombre: "Rep" };
    colInc = db.collection(nombres.inc);
    const registrar = registrarIncidencia({
      incidenciasRepo: new IncidenciasRepoMongo(colInc),
      contador: new ContadorMongo(db.collection(nombres.cont)),
      usuariosRepo: new UsuariosRepoMongo(db.collection(nombres.usr)),
    });

    // Crea una incidencia válida (vía caso de uso) y luego fija estado, fechas, horas y tags.
    // Resolución = hace 1 día (el TTL de 60 días no la toca); creación = resolución - horasTranscurridas.
    const resolucion = new Date(Date.now() - 24 * HORA);
    async function crear(edificio, { estado, horasTranscurridas, horas, tags }) {
      const { codigo } = await registrar(sesion, {
        titulo: "Falla de red en el área",
        descripcion: "Los equipos del área no obtienen conexión.",
        prioridad: "media",
        ubicacion: { edificio, espacio: "Sala 1" },
        categoria: "computo_redes",
        detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.0.0.1", vlan: 10, puerto_uplink: "Gi1/0/1", equipos_afectados: 3 },
      });
      const set = { estado, tags };
      if (estado === "resuelta" || estado === "cerrada") {
        set.fecha_resolucion = resolucion;
        set.fecha_creacion = new Date(resolucion.getTime() - horasTranscurridas * HORA);
        set.horas_invertidas = horas;
      }
      await colInc.updateOne({ codigo }, { $set: set });
    }

    // Pipeline 1 (a mano): Edificio A = resueltas de 24 h y 48 h -> promedio 36, horas 3+5 = 8, 2 incidencias.
    // Biblioteca = 1 cerrada de 10 h -> promedio 10, horas 2, 1 incidencia. Abierta y en_proceso no cuentan.
    // Pipeline 2 (a mano): red = 4, impresora = 3 y wifi = 3 (empate -> por nombre) y 10 etiquetas con 1 uso
    // (t-a..t-j): 13 distintas; el $limit 10 deja red, impresora, wifi y t-a..t-g.
    await crear("Edificio A", { estado: "resuelta", horasTranscurridas: 24, horas: 3, tags: ["red", "wifi", "t-a", "t-b", "t-c"] });
    await crear("Edificio A", { estado: "resuelta", horasTranscurridas: 48, horas: 5, tags: ["red", "wifi", "impresora", "t-d", "t-e"] });
    await crear("Biblioteca", { estado: "cerrada", horasTranscurridas: 10, horas: 2, tags: ["red", "impresora", "t-f", "t-g"] });
    await crear("Edificio A", { estado: "abierta", tags: ["red", "wifi", "t-h"] });
    await crear("Biblioteca", { estado: "en proceso", tags: ["impresora", "t-i", "t-j"] });

    analitica = consultarAnalitica({ analiticaRepo: new AnaliticaRepoMongo(colInc) });
  }, 180000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("Pipeline 1: eficiencia por edificio solo cuenta resueltas/cerradas, orden descendente", async () => {
    const { datos } = await analitica.edificios({ rol: "coordinador" });
    expect(datos).toEqual([
      { edificio: "Edificio A", promedio_horas_resolucion: 36, total_horas_trabajo: 8, total_incidencias: 2 },
      { edificio: "Biblioteca", promedio_horas_resolucion: 10, total_horas_trabajo: 2, total_incidencias: 1 },
    ]);
  });

  it("Pipeline 2: top 10 con totales, edificios, desempate por nombre y $limit", async () => {
    const { datos } = await analitica.tags({ rol: "directivo" });
    expect(datos).toEqual([
      { tag: "red", total: 4, edificios: ["Biblioteca", "Edificio A"] },
      { tag: "impresora", total: 3, edificios: ["Biblioteca", "Edificio A"] },
      { tag: "wifi", total: 3, edificios: ["Edificio A"] },
      { tag: "t-a", total: 1, edificios: ["Edificio A"] },
      { tag: "t-b", total: 1, edificios: ["Edificio A"] },
      { tag: "t-c", total: 1, edificios: ["Edificio A"] },
      { tag: "t-d", total: 1, edificios: ["Edificio A"] },
      { tag: "t-e", total: 1, edificios: ["Edificio A"] },
      { tag: "t-f", total: 1, edificios: ["Biblioteca"] },
      { tag: "t-g", total: 1, edificios: ["Biblioteca"] },
    ]);
  });
});
