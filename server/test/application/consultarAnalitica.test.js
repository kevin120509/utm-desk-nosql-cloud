// Unitarias del caso de uso de analítica con repositorio falso.
import { describe, it, expect } from "vitest";
import { consultarAnalitica } from "../../src/application/consultarAnalitica.js";

const sesion = { id: "1", rol: "coordinador", nombre: "Coo" };

describe("consultarAnalitica", () => {
  it("edificios devuelve { datos } con lo que da el repo", async () => {
    const fila = { edificio: "Edificio A", promedio_horas_resolucion: 36, total_horas_trabajo: 8, total_incidencias: 2 };
    const uc = consultarAnalitica({ analiticaRepo: { eficienciaPorEdificio: async () => [fila], topTags: async () => [] } });
    expect(await uc.edificios(sesion)).toEqual({ datos: [fila] });
  });

  it("tags devuelve { datos } con lo que da el repo", async () => {
    const fila = { tag: "wifi", total: 3, edificios: ["Biblioteca"] };
    const uc = consultarAnalitica({ analiticaRepo: { eficienciaPorEdificio: async () => [], topTags: async () => [fila] } });
    expect(await uc.tags(sesion)).toEqual({ datos: [fila] });
  });

  it("sin datos devuelve arreglo vacío, nunca error", async () => {
    const uc = consultarAnalitica({ analiticaRepo: { eficienciaPorEdificio: async () => [], topTags: async () => [] } });
    expect(await uc.edificios(sesion)).toEqual({ datos: [] });
    expect(await uc.tags(sesion)).toEqual({ datos: [] });
  });
});
