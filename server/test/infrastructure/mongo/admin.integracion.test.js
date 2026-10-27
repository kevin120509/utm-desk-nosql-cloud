// Integración opcional con Atlas: consultas propias del módulo admin (métricas detalladas y
// búsqueda de incidencias) sobre colecciones temporales que se eliminan al final.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient, ObjectId } from "mongodb";
import { MetricasAdminRepoMongo } from "../../../src/infrastructure/mongo/metricasAdminRepo.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);
const nombreTemporal = (base) => `${base}_test_${Math.random().toString(36).slice(2, 10)}`;
const HORA = 3600000;

describe.skipIf(!hayEntorno)("consultas propias del módulo admin (Atlas)", () => {
  let client, db;
  const colecciones = [];
  const temporal = (base) => {
    const nombre = nombreTemporal(base);
    colecciones.push(nombre);
    return db.collection(nombre);
  };

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
  });

  afterAll(async () => {
    for (const nombre of colecciones) await db.collection(nombre).drop().catch(() => {});
    await client?.close();
  });

  describe("MetricasAdminRepoMongo", () => {
    it("calcula conteos, tiempo medio de resolución, técnicos y fallas recurrentes", async () => {
      const col = temporal("incidencias_campus");
      const creada = new Date("2026-10-01T00:00:00Z");
      const doc = (n, extra) => ({
        codigo: `INC-2026-${String(n).padStart(4, "0")}`,
        categoria: "computo_redes",
        estado: "abierta",
        prioridad: "media",
        ubicacion: { edificio: "Edificio A", espacio: "A-1" },
        fecha_creacion: creada,
        ...extra,
      });
      await col.insertMany([
        doc(1, { estado: "resuelta", fecha_resolucion: new Date(creada.getTime() + 2 * HORA), asignado_a: { usuario_id: new ObjectId(), nombre: "Luis" } }),
        doc(2, { categoria: "infraestructura_fisica", estado: "cerrada", fecha_resolucion: new Date(creada.getTime() + 4 * HORA), asignado_a: { usuario_id: new ObjectId(), nombre: "Luis" } }),
        doc(3, { ubicacion: { edificio: "Biblioteca", espacio: "B-2" }, prioridad: "critica" }),
      ]);

      const m = await new MetricasAdminRepoMongo(col).obtener();
      expect(m.por_categoria.find((f) => f.valor === "computo_redes").total).toBe(2);
      expect(m.por_estado.find((f) => f.valor === "abierta").total).toBe(1);
      expect(m.por_prioridad.find((f) => f.valor === "critica").total).toBe(1);
      expect(m.tiempo_resolucion).toEqual({ resueltas: 2, promedio_horas: 3 });
      expect(m.tecnicos_con_mas_incidencias[0]).toEqual({ valor: "Luis", total: 2 });
      expect(m.recurrentes).toEqual([{ edificio: "Edificio A", espacio: "A-1", total: 2 }]);
    });
  });

  describe("IncidenciasRepoMongo.listarAdmin", () => {
    it("busca por código, título o descripción con texto literal", async () => {
      const col = temporal("incidencias_campus");
      await col.insertMany([
        { codigo: "INC-2026-0001", titulo: "Filtración (techo)", descripcion: "Gotea en el aula", categoria: "infraestructura_fisica", estado: "abierta", prioridad: "alta", ubicacion: { edificio: "Edificio B", espacio: "B-1" }, fecha_creacion: new Date("2026-10-01") },
        { codigo: "INC-2026-0002", titulo: "Wifi lento", descripcion: "Sin señal en biblioteca", categoria: "computo_redes", estado: "resuelta", prioridad: "baja", ubicacion: { edificio: "Biblioteca", espacio: "L-1" }, fecha_creacion: new Date("2026-10-02") },
      ]);
      const repo = new IncidenciasRepoMongo(col);

      expect((await repo.listarAdmin({ q: "(techo)", pagina: 1, limite: 10 })).total).toBe(1);
      expect((await repo.listarAdmin({ q: "INC-2026-0002", pagina: 1, limite: 10 })).total).toBe(1);
      expect((await repo.listarAdmin({ q: "señal", pagina: 1, limite: 10 })).total).toBe(1);
      expect((await repo.listarAdmin({ filtros: { estado: "resuelta" }, pagina: 1, limite: 10 })).total).toBe(1);
      expect((await repo.listarAdmin({ q: "wifi", filtros: { prioridad: "alta" }, pagina: 1, limite: 10 })).total).toBe(0);
    });
  });
});
