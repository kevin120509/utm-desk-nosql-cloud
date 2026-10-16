// Integración con Atlas: búsqueda textual en español (RF-09) con colecciones temporales.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";
import { ContadorMongo } from "../../../src/infrastructure/mongo/contadorMongo.js";
import { UsuariosRepoMongo } from "../../../src/infrastructure/mongo/usuariosRepo.js";
import { registrarIncidencia } from "../../../src/application/registrarIncidencia.js";
import { buscarIncidencias } from "../../../src/application/buscarIncidencias.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

const detalleInfra = { tipo_dano: "filtracion", riesgo_seguridad: "bajo", requiere_contratista: false };
const detalleRedes = { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 28 };

// Busca recursivamente la primera etapa de texto del plan (TEXT_MATCH, TEXT_OR, TEXT...).
function etapaTexto(plan) {
  if (plan && typeof plan === "object") {
    if (typeof plan.stage === "string" && /^TEXT/.test(plan.stage)) return plan.stage;
    for (const v of Object.values(plan)) {
      const r = etapaTexto(v);
      if (r) return r;
    }
  }
  return null;
}

// El índice de texto puede tardar un instante: reintenta unos cientos de ms.
async function conReintento(fn, cumple, intentos = 8) {
  let r;
  for (let i = 0; i < intentos; i++) {
    r = await fn();
    if (cumple(r)) return r;
    await new Promise((ok) => setTimeout(ok, 250));
  }
  return r;
}

describe.skipIf(!hayEntorno)("búsqueda textual (Atlas real)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = { inc: `incidencias_campus_test_${sufijo}`, usr: `usuarios_test_${sufijo}`, cont: `contadores_test_${sufijo}` };
  let client, db, colInc, buscar, sesionAna, sesionBeto, sesionTec, enTitulo, enDescripcion;

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
    buscar = buscarIncidencias({ incidenciasRepo });

    const alta = (sesion, titulo, descripcion, cat = "infraestructura") =>
      registrar(sesion, {
        titulo,
        descripcion,
        categoria: cat,
        prioridad: "media",
        ubicacion: { edificio: "Edificio A", espacio: "A-1" },
        detalle_especifico: cat === "infraestructura" ? detalleInfra : detalleRedes,
      });

    // Ana: palabra solo en la descripción (peso 5). Beto: palabra en el título (peso 10).
    enDescripcion = await alta(sesionAna, "Problema en el aula 12", "Se observa una filtración en el techo del aula durante la lluvia.");
    enTitulo = await alta(sesionBeto, "Filtraciones recurrentes en el edificio", "El agua escurre por las paredes del pasillo.");
    await alta(sesionAna, "Falla de red en laboratorio", "Sin conexión en las computadoras del laboratorio.", "computo_redes");
  }, 120000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  const codigos = (r) => r.datos.map((d) => d.codigo);

  it("'filtración' encuentra 'filtraciones' (misma raíz) y 'filtracion' sin acento", async () => {
    const con = await conReintento(() => buscar(sesionTec, { q: "filtración" }), (r) => r.datos.length >= 2);
    expect(codigos(con)).toEqual(expect.arrayContaining([enTitulo.codigo, enDescripcion.codigo]));
    expect(con.datos).toHaveLength(2); // la incidencia de red no coincide
    const sin = await buscar(sesionTec, { q: "filtracion" });
    expect(codigos(sin)).toEqual(expect.arrayContaining([enTitulo.codigo, enDescripcion.codigo]));
  }, 60000);

  it("el título (peso 10) aparece antes que la descripción (peso 5), por score descendente", async () => {
    const r = await buscar(sesionTec, { q: "filtración" });
    expect(r.datos[0].codigo).toBe(enTitulo.codigo);
    const scores = r.datos.map((d) => d.score);
    expect(scores.every((s) => typeof s === "number")).toBe(true);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(scores[0]).toBeGreaterThan(scores[1]);
    // El resultado es ligero: sin bitácora, evidencias ni detalle.
    expect(r.datos[0]).not.toHaveProperty("historial_seguimiento");
    expect(r.datos[0]).not.toHaveProperty("detalle_especifico");
  }, 60000);

  it("un reportante solo obtiene resultados propios", async () => {
    expect(codigos(await buscar(sesionAna, { q: "filtración" }))).toEqual([enDescripcion.codigo]);
    expect(codigos(await buscar(sesionBeto, { q: "filtración" }))).toEqual([enTitulo.codigo]);
  }, 60000);

  it("una búsqueda sin coincidencias devuelve arreglo vacío", async () => {
    expect((await buscar(sesionTec, { q: "xyzinexistente" })).datos).toEqual([]);
  }, 60000);

  it("explain(): el plan ganador contiene una etapa de texto", async () => {
    const e = await colInc.find({ $text: { $search: "filtración" } }).explain("queryPlanner");
    const etapa = etapaTexto(e.queryPlanner.winningPlan);
    console.log("explain búsqueda textual, etapa de texto:", etapa);
    expect(etapa).not.toBeNull();
  }, 60000);
});
