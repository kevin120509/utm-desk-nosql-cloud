// Integración con Atlas: lectura, filtros, paginación y explain().
// Usa colecciones temporales que se eliminan al final.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";
import { ContadorMongo } from "../../../src/infrastructure/mongo/contadorMongo.js";
import { UsuariosRepoMongo } from "../../../src/infrastructure/mongo/usuariosRepo.js";
import { registrarIncidencia } from "../../../src/application/registrarIncidencia.js";
import { listarIncidencias, obtenerIncidencia } from "../../../src/application/consultarIncidencias.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

const detalleRedes = { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 28 };
const detalleInfra = { tipo_dano: "filtracion", riesgo_seguridad: "bajo", requiere_contratista: false };
const detalleAcad = { plataforma: "correo_institucional", periodo_escolar: "2026-1", estudiantes_impactados: 40 };

const plantillas = [
  { categoria: "computo_redes", detalle_especifico: detalleRedes, edificio: "Laboratorios de Cómputo", prioridad: "alta" },
  { categoria: "infraestructura_fisica", detalle_especifico: detalleInfra, edificio: "Edificio A", prioridad: "media" },
  { categoria: "servicios_academicos", detalle_especifico: detalleAcad, edificio: "Administrativo", prioridad: "baja" },
];

// Recorre el plan de ejecución y junta los nombres de etapa (IXSCAN, COLLSCAN, SORT...).
function etapas(plan, acumulado = []) {
  if (plan && typeof plan === "object") {
    if (plan.stage) acumulado.push(plan.stage);
    for (const valor of Object.values(plan)) etapas(valor, acumulado);
  }
  return acumulado;
}

describe.skipIf(!hayEntorno)("lectura de incidencias (Atlas real)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = {
    inc: `incidencias_campus_test_${sufijo}`,
    usr: `usuarios_test_${sufijo}`,
    cont: `contadores_test_${sufijo}`,
  };
  let client, db, colInc, listar, obtener, sesionAna, sesionBeto, sesionTec, creadas;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, { coleccionIncidencias: nombres.inc, coleccionUsuarios: nombres.usr });

    const hash = await bcrypt.hash("t" + Math.random(), 4);
    const base = { password_hash: hash, activo: true };
    const { insertedIds } = await db.collection(nombres.usr).insertMany([
      { nombre: "Ana", correo: `ana_${sufijo}@utm.mx`, rol: "reportante", tipo: "docente", ...base },
      { nombre: "Beto", correo: `beto_${sufijo}@utm.mx`, rol: "reportante", tipo: "estudiante", ...base },
      { nombre: "Tec", correo: `tec_${sufijo}@utm.mx`, rol: "tecnico", ...base },
    ]);
    sesionAna = { id: String(insertedIds[0]), rol: "reportante", nombre: "Ana" };
    sesionBeto = { id: String(insertedIds[1]), rol: "reportante", nombre: "Beto" };
    sesionTec = { id: String(insertedIds[2]), rol: "tecnico", nombre: "Tec" };

    colInc = db.collection(nombres.inc);
    const incidenciasRepo = new IncidenciasRepoMongo(colInc);
    const registrar = registrarIncidencia({
      incidenciasRepo,
      contador: new ContadorMongo(db.collection(nombres.cont)),
      usuariosRepo: new UsuariosRepoMongo(db.collection(nombres.usr)),
    });
    listar = listarIncidencias({ incidenciasRepo });
    obtener = obtenerIncidencia({ incidenciasRepo });

    // 8 incidencias: Ana 5 (las plantillas rotan), Beto 3.
    creadas = [];
    for (let i = 0; i < 8; i++) {
      const p = plantillas[i % 3];
      const sesion = i < 5 ? sesionAna : sesionBeto;
      creadas.push(
        await registrar(sesion, {
          titulo: `Incidencia de prueba número ${i + 1}`,
          descripcion: `Descripción suficiente para la incidencia ${i + 1}.`,
          categoria: p.categoria,
          prioridad: p.prioridad,
          ubicacion: { edificio: p.edificio, espacio: `E-${i + 1}` },
          detalle_especifico: p.detalle_especifico,
        }),
      );
    }
    // Una "en proceso" y una "resuelta" (con fecha_resolucion, como exige el validador).
    await colInc.updateOne({ codigo: creadas[0].codigo }, { $set: { estado: "en proceso" } });
    await colInc.updateOne({ codigo: creadas[1].codigo }, { $set: { estado: "resuelta", fecha_resolucion: new Date() } });
  }, 120000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("el personal ve todas, la más reciente primero, con total", async () => {
    const r = await listar(sesionTec, {});
    expect(r.total).toBe(8);
    expect(r.datos).toHaveLength(8);
    const fechas = r.datos.map((d) => d.fecha_creacion.getTime());
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
    // El listado es ligero: sin bitácora, evidencias ni detalle.
    expect(r.datos[0]).not.toHaveProperty("historial_seguimiento");
    expect(r.datos[0]).not.toHaveProperty("evidencias_adjuntas");
    expect(r.datos[0]).not.toHaveProperty("detalle_especifico");
  }, 60000);

  it("filtra por categoría, estado, prioridad y edificio", async () => {
    expect((await listar(sesionTec, { categoria: "computo_redes" })).total).toBe(3);
    expect((await listar(sesionTec, { estado: "en proceso" })).total).toBe(1);
    expect((await listar(sesionTec, { estado: "resuelta" })).total).toBe(1);
    expect((await listar(sesionTec, { prioridad: "baja" })).total).toBe(2);
    expect((await listar(sesionTec, { edificio: "Edificio A" })).total).toBe(3);
    const combinado = await listar(sesionTec, { categoria: "infraestructura_fisica", estado: "resuelta", edificio: "Edificio A" });
    expect(combinado.total).toBe(1);
    expect(combinado.datos[0].codigo).toBe(creadas[1].codigo);
  }, 60000);

  it("pagina de forma estable y sin repetir", async () => {
    const p1 = await listar(sesionTec, { pagina: 1, limite: 3 });
    const p2 = await listar(sesionTec, { pagina: 2, limite: 3 });
    const p3 = await listar(sesionTec, { pagina: 3, limite: 3 });
    expect(p1.datos).toHaveLength(3);
    expect(p2.datos).toHaveLength(3);
    expect(p3.datos).toHaveLength(2);
    expect(p1.total).toBe(8);
    const codigos = [...p1.datos, ...p2.datos, ...p3.datos].map((d) => d.codigo);
    expect(new Set(codigos).size).toBe(8);
  }, 60000);

  it("un reportante solo ve las suyas y no abre las ajenas", async () => {
    const ana = await listar(sesionAna, {});
    expect(ana.total).toBe(5);
    const beto = await listar(sesionBeto, {});
    expect(beto.total).toBe(3);
    // creadas[7] es de Beto: Ana recibe SIN_PERMISO; Beto sí la abre.
    await expect(obtener(sesionAna, creadas[7].codigo)).rejects.toMatchObject({ codigo: "SIN_PERMISO" });
    expect((await obtener(sesionBeto, creadas[7].codigo)).codigo).toBe(creadas[7].codigo);
  }, 60000);

  it("el expediente llega completo en una lectura y un código inexistente da NO_ENCONTRADO", async () => {
    const doc = await obtener(sesionTec, creadas[2].codigo);
    expect(doc.historial_seguimiento).toHaveLength(1);
    expect(doc.detalle_especifico).toBeTypeOf("object");
    await expect(obtener(sesionTec, "INC-2026-9999")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  }, 60000);

  it("explain(): el filtro categoría+estado+edificio usa IXSCAN en idx_cat_estado_edificio", async () => {
    const filtro = { categoria: "computo_redes", estado: "abierta", "ubicacion.edificio": "Laboratorios de Cómputo" };
    const explicacion = await colInc.find(filtro).sort({ fecha_creacion: -1, _id: -1 }).explain("queryPlanner");
    const plan = explicacion.queryPlanner.winningPlan;
    const lista = etapas(plan);
    expect(lista).toContain("IXSCAN");
    expect(JSON.stringify(plan)).toContain("idx_cat_estado_edificio");

    // Reporte informativo de las etapas de cada forma de consulta.
    const formas = {
      "sin filtros": {},
      "solo categoria": { categoria: "computo_redes" },
      "categoria+estado+edificio": filtro,
      "solo prioridad": { prioridad: "alta" },
    };
    for (const [nombre, f] of Object.entries(formas)) {
      const e = await colInc.find(f).sort({ fecha_creacion: -1, _id: -1 }).explain("queryPlanner");
      console.log(`explain ${nombre}:`, [...new Set(etapas(e.queryPlanner.winningPlan))].join(" > "));
    }
  }, 60000);
});
