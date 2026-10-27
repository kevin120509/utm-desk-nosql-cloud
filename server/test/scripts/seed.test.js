// Seed (B13): el generador es puro, así que se prueba sin tocar Atlas; y una prueba de
// integración inserta los 24 documentos en una colección temporal con el $jsonSchema real.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient, ObjectId } from "mongodb";
import { USUARIOS_DEMO, construirDatos, evidenciasFalsas } from "../../scripts/seed/datos.js";
import { crearMuestras, crearPng, crearPdf } from "../../scripts/seed/archivosMuestra.js";
import { verificarConjunto } from "../../scripts/seed/verificar.js";
import { detectarTipo } from "../../src/infrastructure/archivos/detectarTipo.js";
import { configurarBaseDeDatos } from "../../src/infrastructure/mongo/configurarBaseDeDatos.js";

const AHORA = new Date("2026-10-15T18:00:00Z");
const muestras = crearMuestras();

function generar() {
  const usuarios = Object.fromEntries(USUARIOS_DEMO.map((u) => [u.clave, { ...u, _id: new ObjectId() }]));
  const datos = construirDatos({ ahora: AHORA, usuarios });
  evidenciasFalsas(datos.incidencias, datos.planEvidencias, muestras);
  return { usuarios, ...datos };
}

const contar = (docs, f) => {
  const r = {};
  for (const d of docs) r[f(d)] = (r[f(d)] ?? 0) + 1;
  return r;
};

describe("seed: distribución del plan §9", () => {
  const { incidencias } = generar();

  it("24 incidencias, 8 por categoría", () => {
    expect(incidencias).toHaveLength(24);
    expect(contar(incidencias, (d) => d.categoria)).toEqual({ computo_redes: 8, infraestructura_fisica: 8, servicios_academicos: 8 });
  });

  it("estados 5/4/3/6/6 y prioridades 5/9/7/3", () => {
    expect(contar(incidencias, (d) => d.estado)).toEqual({
      abierta: 5, "en proceso": 4, "en espera": 3, resuelta: 6, cerrada: 6,
    });
    expect(contar(incidencias, (d) => d.prioridad)).toEqual({ baja: 5, media: 9, alta: 7, critica: 3 });
  });

  it("12 con fecha_resolucion (solo resuelta/cerrada) y 18 con evidencias", () => {
    expect(incidencias.filter((d) => d.fecha_resolucion).length).toBe(12);
    expect(incidencias.filter((d) => d.evidencias_adjuntas.length > 0).length).toBe(18);
  });

  it("5 edificios y recurrentes: A-203 y LC-2 con 3 cada una", () => {
    expect(new Set(incidencias.map((d) => d.ubicacion.edificio)).size).toBe(5);
    const n = contar(incidencias, (d) => d.ubicacion.espacio);
    expect(n["A-203"]).toBe(3);
    expect(n["LC-2"]).toBe(3);
  });

  it("correo bloqueado en dos periodos distintos", () => {
    const periodos = incidencias
      .filter((d) => d.detalle_especifico.plataforma === "correo_institucional" && d.tags.includes("recurrente"))
      .map((d) => d.detalle_especifico.periodo_escolar);
    expect(new Set(periodos).size).toBe(2);
  });
});

describe("seed: coherencia de cada documento", () => {
  const { incidencias, contadores } = generar();

  it("códigos INC-AAAA-NNNN consecutivos en orden cronológico", () => {
    const ordenadas = [...incidencias].sort((a, b) => a.fecha_creacion - b.fecha_creacion);
    ordenadas.forEach((d, i) => expect(d.codigo).toBe(`INC-2026-${String(i + 1).padStart(4, "0")}`));
  });

  it("la bitácora es válida: inicial sin estado_anterior, transiciones encadenadas y fechas crecientes", () => {
    for (const d of incidencias) {
      const [primera, ...resto] = d.historial_seguimiento;
      expect(primera.estado_nuevo).toBe("abierta");
      expect(primera).not.toHaveProperty("estado_anterior");
      let anterior = "abierta";
      let t = primera.fecha.getTime();
      for (const h of resto) {
        expect(h.estado_anterior).toBe(anterior);
        expect(h.fecha.getTime()).toBeGreaterThan(t);
        anterior = h.estado_nuevo;
        t = h.fecha.getTime();
      }
      expect(d.estado).toBe(anterior);
      expect(d.fecha_actualizacion.getTime()).toBe(t);
      expect(d.fecha_creacion.getTime()).toBeLessThanOrEqual(AHORA.getTime());
    }
  });

  it("fecha_resolucion es la del paso que pasó a resuelta y anterior o igual a ahora", () => {
    for (const d of incidencias.filter((x) => x.fecha_resolucion)) {
      const paso = d.historial_seguimiento.find((h) => h.estado_nuevo === "resuelta");
      expect(d.fecha_resolucion.getTime()).toBe(paso.fecha.getTime());
      expect(d.fecha_resolucion.getTime()).toBeLessThanOrEqual(AHORA.getTime());
    }
  });

  it("asignado_a solo si actuó un técnico; las cerradas por el coordinador conservan fecha_resolucion", () => {
    for (const d of incidencias) {
      const tecnico = d.historial_seguimiento.slice(1).some((h) => h.autor.nombre === "Luis Cauich" || h.autor.nombre === "Marisol Be");
      expect(Boolean(d.asignado_a)).toBe(tecnico);
    }
  });

  it("los contadores cubren el consecutivo anual y los diarios usados", () => {
    const anual = contadores.find((c) => c._id === "contador:incidencias:anual:2026");
    expect(anual.valor).toBe(24);
    const diarios = contadores.filter((c) => c._id.includes(":2026-") || c._id.includes(":2025-"));
    const suma = diarios.reduce((s, c) => s + c.valor, 0);
    expect(suma).toBe(24);
    // consecutivo_diario de cada documento llega al valor del contador de su día y categoría
    for (const c of diarios) {
      const [, , dia, categoria] = c._id.split(":");
      const delDia = incidencias.filter(
        (d) => d.categoria === categoria && d.consecutivo_diario >= 1 && contadorDia(d.fecha_creacion) === dia,
      );
      expect(Math.max(...delDia.map((d) => d.consecutivo_diario))).toBe(c.valor);
    }
  });

  it("pasa la verificación completa contra el enunciado", () => {
    const resultados = verificarConjunto(incidencias, { ahora: AHORA });
    const fallos = resultados.filter((r) => !r.ok);
    expect(fallos).toEqual([]);
  });
});

function contadorDia(fecha) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Merida", year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);
}

describe("verificarConjunto detecta datos que incumplen", () => {
  it("falla si hay un null, si falta fecha_resolucion o si una resolución es muy vieja", () => {
    const { incidencias } = generar();
    const malos = structuredClone(incidencias);
    // structuredClone conserva Date y ObjectId
    const resuelta = malos.find((d) => d.estado === "resuelta");
    delete resuelta.fecha_resolucion;
    malos.find((d) => d.estado === "abierta").asignado_a = null;
    const nombres = verificarConjunto(malos, { ahora: AHORA }).filter((r) => !r.ok).map((r) => r.nombre);
    expect(nombres.some((n) => n.startsWith("fecha_resolucion es Date"))).toBe(true);
    expect(nombres.some((n) => n.startsWith("Ningún campo null"))).toBe(true);

    const viejos = structuredClone(incidencias);
    const conRes = viejos.find((d) => d.fecha_resolucion);
    conRes.fecha_resolucion = new Date(AHORA.getTime() - 50 * 86_400_000);
    const fallos = verificarConjunto(viejos, { ahora: AHORA }).filter((r) => !r.ok);
    expect(fallos.some((r) => r.nombre.startsWith("fecha_resolucion reciente"))).toBe(true);
  });
});

describe("archivos de muestra", () => {
  it("el PNG y el PDF generados se detectan como su tipo real", async () => {
    expect(await detectarTipo(crearPng(64, 36, [10, 20, 30]))).toBe("image/png");
    expect(await detectarTipo(crearPdf("Prueba"))).toBe("application/pdf");
    for (const m of Object.values(muestras)) {
      expect(await detectarTipo(m.buffer)).toBe(m.tipoMime);
      expect(m.buffer.length).toBeLessThan(4 * 1024 * 1024);
    }
  });
});

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

describe.skipIf(!hayEntorno)("seed contra el $jsonSchema real de Atlas (colección temporal)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = { inc: `incidencias_campus_test_${sufijo}`, usr: `usuarios_test_${sufijo}` };
  let client, db;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, { coleccionIncidencias: nombres.inc, coleccionUsuarios: nombres.usr });
  }, 120000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("las 24 incidencias se insertan y se leen verificadas", async () => {
    const { incidencias } = generar();
    const r = await db.collection(nombres.inc).insertMany(incidencias);
    expect(r.insertedCount).toBe(24);
    const leidas = await db.collection(nombres.inc).find({}).toArray();
    const fallos = verificarConjunto(leidas, { ahora: AHORA }).filter((x) => !x.ok);
    expect(fallos).toEqual([]);
  }, 90000);
});
