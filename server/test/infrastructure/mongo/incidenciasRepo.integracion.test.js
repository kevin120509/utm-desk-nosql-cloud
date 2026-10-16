// Integración con Atlas: alta real contra el $jsonSchema. Colecciones temporales que se eliminan al final.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";
import { ContadorMongo } from "../../../src/infrastructure/mongo/contadorMongo.js";
import { UsuariosRepoMongo } from "../../../src/infrastructure/mongo/usuariosRepo.js";
import { registrarIncidencia } from "../../../src/application/registrarIncidencia.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

const entradas = [
  {
    titulo: "Switch del laboratorio sin respuesta",
    descripcion: "Desde las 8:00 los equipos no obtienen red.",
    prioridad: "alta",
    ubicacion: { edificio: "Laboratorios de Cómputo", piso: 1, espacio: "LC-2" },
    categoria: "computo_redes",
    detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 28 },
  },
  {
    titulo: "Filtración en el aula A-203",
    descripcion: "Gotea agua del techo sobre los pupitres.",
    prioridad: "media",
    ubicacion: { edificio: "Edificio A", espacio: "A-203" },
    categoria: "infraestructura",
    detalle_especifico: {
      tipo_dano: "filtracion",
      riesgo_seguridad: "bajo",
      requiere_contratista: true,
      contratista_externo: "Plomeros SA",
      insumos_requeridos: ["sellador"],
    },
  },
  {
    titulo: "No abre el portal de calificaciones",
    descripcion: "Los alumnos reciben error al entrar al portal.",
    prioridad: "baja",
    ubicacion: { edificio: "Administrativo", espacio: "Sistemas" },
    categoria: "academico",
    detalle_especifico: { plataforma: "portal_calificaciones", periodo_escolar: "2026-1", estudiantes_impactados: 40 },
  },
];

describe.skipIf(!hayEntorno)("registrarIncidencia (Atlas real)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = {
    inc: `incidencias_campus_test_${sufijo}`,
    usr: `usuarios_test_${sufijo}`,
    cont: `contadores_test_${sufijo}`,
  };
  let client, db, registrar, colInc, sesion;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, { coleccionIncidencias: nombres.inc, coleccionUsuarios: nombres.usr });
    const hash = await bcrypt.hash("t" + Math.random(), 4);
    const r = await db.collection(nombres.usr).insertOne({
      nombre: "Ana Prueba",
      correo: `ana_${sufijo}@utm.mx`,
      rol: "reportante",
      tipo: "docente",
      password_hash: hash,
      activo: true,
    });
    sesion = { id: String(r.insertedId), rol: "reportante", nombre: "Ana Prueba" };
    colInc = db.collection(nombres.inc);
    registrar = registrarIncidencia({
      incidenciasRepo: new IncidenciasRepoMongo(colInc),
      contador: new ContadorMongo(db.collection(nombres.cont)),
      usuariosRepo: new UsuariosRepoMongo(db.collection(nombres.usr)),
    });
  }, 60000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("una incidencia de cada categoría pasa el $jsonSchema y no tiene null", async () => {
    for (const entrada of entradas) {
      const creada = await registrar(sesion, entrada);
      const leida = await colInc.findOne({ _id: creada._id });
      expect(leida.categoria).toBe(entrada.categoria);
      expect(JSON.stringify(leida)).not.toContain("null");
    }
  }, 60000);

  it("dos altas seguidas dan consecutivos y códigos distintos", async () => {
    const a = await registrar(sesion, entradas[0]);
    const b = await registrar(sesion, entradas[0]);
    expect(b.codigo).not.toBe(a.codigo);
    expect(b.consecutivo_diario).toBe(a.consecutivo_diario + 1);
  }, 60000);
});
