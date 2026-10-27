// Prueba de integración contra Atlas real: usa colecciones temporales que se dropean al final.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { obtenerBaseDeDatos, cerrarCliente } from "../../../src/infrastructure/mongo/cliente.js";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";

const sufijo = randomBytes(4).toString("hex");
const NOMBRE_INC = `incidencias_campus_test_${sufijo}`;
const NOMBRE_USU = `usuarios_test_${sufijo}`;

let db;
let col;
let contador = 0;

const ahora = () => new Date();
const autor = () => ({ usuario_id: new ObjectId(), nombre: "Mtra. Ana Pech" });

// Documento base válido de computo_redes; cada prueba lo modifica.
function docBase(extra = {}) {
  contador += 1;
  return {
    codigo: `INC-2026-${String(1000 + contador).padStart(4, "0")}`,
    consecutivo_diario: 1,
    titulo: "Switch del laboratorio LC-2 sin respuesta",
    descripcion: "Desde las 8:00 los equipos del laboratorio no obtienen red.",
    categoria: "computo_redes",
    prioridad: "alta",
    estado: "abierta",
    reportante: { usuario_id: new ObjectId(), nombre: "Mtra. Ana Pech", tipo: "docente", correo: "ana.pech@utmetropolitana.edu.mx" },
    ubicacion: { edificio: "Laboratorios de Cómputo", piso: 1, espacio: "LC-2" },
    detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 28 },
    tags: ["switch", "sin-red"],
    historial_seguimiento: [{ fecha: ahora(), autor: autor(), estado_nuevo: "abierta", comentario: "Incidencia registrada", horas: 0 }],
    evidencias_adjuntas: [],
    horas_invertidas: 0,
    fecha_creacion: ahora(),
    fecha_actualizacion: ahora(),
    ...extra,
  };
}

// Inserta y espera un error de validación (código 121).
async function esperaRechazo(doc) {
  let error;
  try {
    await col.insertOne(doc);
  } catch (e) {
    error = e;
  }
  expect(error, "el documento debía ser rechazado").toBeDefined();
  expect(error.code).toBe(121);
}

beforeAll(async () => {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
    throw new Error("Faltan MONGODB_URI y/o MONGODB_DB en server/.env: estas pruebas se conectan a Atlas.");
  }
  db = await obtenerBaseDeDatos();
  await configurarBaseDeDatos(db, { coleccionIncidencias: NOMBRE_INC, coleccionUsuarios: NOMBRE_USU });
  col = db.collection(NOMBRE_INC);
}, 60000);

afterAll(async () => {
  try {
    if (db) {
      await db.collection(NOMBRE_INC).drop().catch(() => {});
      await db.collection(NOMBRE_USU).drop().catch(() => {});
    }
  } finally {
    await cerrarCliente();
  }
}, 60000);

describe("validador $jsonSchema: documentos válidos", () => {
  it("inserta computo_redes", async () => {
    const r = await col.insertOne(docBase());
    expect(r.acknowledged).toBe(true);
  });

  it("inserta infraestructura (con opcionales)", async () => {
    const r = await col.insertOne(
      docBase({
        categoria: "infraestructura_fisica",
        detalle_especifico: {
          tipo_dano: "filtracion",
          riesgo_seguridad: "medio",
          requiere_contratista: true,
          contratista_externo: "Plomería del Sureste",
          insumos_requeridos: ["tubo pvc", "sellador"],
        },
      }),
    );
    expect(r.acknowledged).toBe(true);
  });

  it("inserta academico", async () => {
    const r = await col.insertOne(
      docBase({
        categoria: "servicios_academicos",
        detalle_especifico: { plataforma: "lms", periodo_escolar: "2026-3", estudiantes_impactados: 35, codigo_curso: "BD-301" },
      }),
    );
    expect(r.acknowledged).toBe(true);
  });

  it("inserta resuelta con fecha_resolucion y asignado_a", async () => {
    const r = await col.insertOne(
      docBase({ estado: "resuelta", fecha_resolucion: ahora(), asignado_a: { usuario_id: new ObjectId(), nombre: "Luis Cauich" } }),
    );
    expect(r.acknowledged).toBe(true);
  });

  it("abierta sin fecha_resolucion es válida", async () => {
    const r = await col.insertOne(docBase({ estado: "abierta" }));
    expect(r.acknowledged).toBe(true);
  });
});

describe("validador $jsonSchema: documentos inválidos (código 121)", () => {
  it("detalle_especifico de otra categoría", async () => {
    await esperaRechazo(
      docBase({
        categoria: "servicios_academicos",
        detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.0.0.1", vlan: 10, puerto_uplink: "Gi1", equipos_afectados: 3 },
      }),
    );
  });

  it("estado resuelta sin fecha_resolucion", async () => {
    await esperaRechazo(docBase({ estado: "resuelta" }));
  });

  it("estado cerrada sin fecha_resolucion", async () => {
    await esperaRechazo(docBase({ estado: "cerrada" }));
  });

  it("campo extra en la raíz", async () => {
    await esperaRechazo(docBase({ campo_inventado: "x" }));
  });

  it("prioridad urgente", async () => {
    await esperaRechazo(docBase({ prioridad: "urgente" }));
  });

  it("titulo corto", async () => {
    await esperaRechazo(docBase({ titulo: "Hola" }));
  });

  it("tags con duplicados", async () => {
    await esperaRechazo(docBase({ tags: ["red", "red"] }));
  });

  it("null en un campo", async () => {
    await esperaRechazo(docBase({ asignado_a: null }));
  });

  it("vlan fuera de rango", async () => {
    await esperaRechazo(
      docBase({ detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 5000, puerto_uplink: "Gi1", equipos_afectados: 2 } }),
    );
  });
});

describe("índices", () => {
  it("getIndexes() lista los 5 nombres", async () => {
    const nombres = (await col.indexes()).map((i) => i.name);
    for (const n of ["idx_cat_estado_edificio", "idx_ttl_resolucion", "idx_texto_es", "idx_codigo", "idx_reportante"]) {
      expect(nombres).toContain(n);
    }
  });

  it("idx_codigo único rechaza duplicado (11000)", async () => {
    const doc = docBase();
    await col.insertOne(doc);
    let error;
    try {
      await col.insertOne(docBase({ codigo: doc.codigo }));
    } catch (e) {
      error = e;
    }
    expect(error?.code).toBe(11000);
  });

  it("TTL con expireAfterSeconds 5184000", async () => {
    const ttl = (await col.indexes()).find((i) => i.name === "idx_ttl_resolucion");
    expect(ttl.expireAfterSeconds).toBe(5184000);
  });

  it("usuarios: correo único", async () => {
    const usu = db.collection(NOMBRE_USU);
    const idx = (await usu.indexes()).find((i) => i.name === "idx_correo_unico");
    expect(idx?.unique).toBe(true);
  });
});
