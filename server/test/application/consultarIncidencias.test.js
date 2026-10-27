// Casos de uso de lectura con un repositorio falso en memoria.
import { describe, it, expect, vi } from "vitest";
import { ZodError } from "zod";
import { listarIncidencias, obtenerIncidencia } from "../../src/application/consultarIncidencias.js";
import { ErrorApp } from "../../src/application/errores.js";

const doc = (codigo, usuarioId) => ({ codigo, reportante: { usuario_id: usuarioId, nombre: "X" } });

function repoFalso(docs = []) {
  return {
    listar: vi.fn(async () => ({ datos: docs, total: docs.length })),
    buscarPorCodigo: vi.fn(async (codigo) => docs.find((d) => d.codigo === codigo) ?? null),
  };
}

describe("listarIncidencias", () => {
  it("aplica valores por defecto de página y límite y devuelve { datos, total, pagina }", async () => {
    const repo = repoFalso([doc("INC-2026-0001", "u1")]);
    const res = await listarIncidencias({ incidenciasRepo: repo })({ id: "t1", rol: "tecnico" }, {});
    expect(res).toEqual({ datos: [doc("INC-2026-0001", "u1")], total: 1, pagina: 1 });
    expect(repo.listar).toHaveBeenCalledWith({ filtros: {}, propietarioId: undefined, pagina: 1, limite: 10 });
  });

  it("convierte pagina y limite de texto a número y pasa los filtros", async () => {
    const repo = repoFalso();
    await listarIncidencias({ incidenciasRepo: repo })(
      { id: "c1", rol: "coordinador" },
      { categoria: "servicios_academicos", estado: "abierta", prioridad: "alta", edificio: "Biblioteca", pagina: "3", limite: "20" },
    );
    expect(repo.listar).toHaveBeenCalledWith({
      filtros: { categoria: "servicios_academicos", estado: "abierta", prioridad: "alta", edificio: "Biblioteca" },
      propietarioId: undefined,
      pagina: 3,
      limite: 20,
    });
  });

  it("un reportante queda limitado a sus propias incidencias (propietarioId = sesión)", async () => {
    const repo = repoFalso();
    await listarIncidencias({ incidenciasRepo: repo })({ id: "r1", rol: "reportante" }, {});
    expect(repo.listar.mock.calls[0][0].propietarioId).toBe("r1");
  });

  it("el cliente no puede pasar un propietario ajeno: es un parámetro desconocido (400)", async () => {
    const repo = repoFalso();
    const listar = listarIncidencias({ incidenciasRepo: repo });
    await expect(listar({ id: "r1", rol: "reportante" }, { propietarioId: "otro" })).rejects.toBeInstanceOf(ZodError);
    expect(repo.listar).not.toHaveBeenCalled();
  });

  it.each([
    [{ categoria: "otra" }],
    [{ estado: "cualquiera" }],
    [{ prioridad: "urgente" }],
    [{ pagina: "0" }],
    [{ pagina: "abc" }],
    [{ limite: "51" }],
    [{ limite: "0" }],
    [{ edificio: "" }],
    [{ desconocido: "1" }],
  ])("query inválida %j lanza ZodError y no consulta la BD", async (query) => {
    const repo = repoFalso();
    await expect(listarIncidencias({ incidenciasRepo: repo })({ id: "t", rol: "tecnico" }, query)).rejects.toBeInstanceOf(ZodError);
    expect(repo.listar).not.toHaveBeenCalled();
  });
});

describe("obtenerIncidencia", () => {
  const docs = [doc("INC-2026-0001", "r1")];

  it("devuelve el expediente al personal y al dueño", async () => {
    const obtener = obtenerIncidencia({ incidenciasRepo: repoFalso(docs) });
    expect((await obtener({ id: "t1", rol: "tecnico" }, "INC-2026-0001")).codigo).toBe("INC-2026-0001");
    expect((await obtener({ id: "r1", rol: "reportante" }, "INC-2026-0001")).codigo).toBe("INC-2026-0001");
    expect((await obtener({ id: "d1", rol: "directivo" }, "INC-2026-0001")).codigo).toBe("INC-2026-0001");
  });

  it("SIN_PERMISO si un reportante abre una incidencia ajena", async () => {
    const obtener = obtenerIncidencia({ incidenciasRepo: repoFalso(docs) });
    await expect(obtener({ id: "r2", rol: "reportante" }, "INC-2026-0001")).rejects.toMatchObject({
      name: "ErrorApp",
      codigo: "SIN_PERMISO",
    });
  });

  it("NO_ENCONTRADO si el código no existe", async () => {
    const obtener = obtenerIncidencia({ incidenciasRepo: repoFalso(docs) });
    const err = await obtener({ id: "t1", rol: "tecnico" }, "INC-2026-9999").catch((e) => e);
    expect(err).toBeInstanceOf(ErrorApp);
    expect(err.codigo).toBe("NO_ENCONTRADO");
  });

  it("NO_ENCONTRADO sin tocar la BD si el código tiene mala forma", async () => {
    const repo = repoFalso(docs);
    const obtener = obtenerIncidencia({ incidenciasRepo: repo });
    await expect(obtener({ id: "t1", rol: "tecnico" }, "buscar")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect(repo.buscarPorCodigo).not.toHaveBeenCalled();
  });
});
