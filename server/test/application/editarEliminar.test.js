// Casos de uso editarIncidencia y eliminarIncidencia con fakes (RF-12).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ZodError } from "zod";
import { editarIncidencia } from "../../src/application/editarIncidencia.js";
import { eliminarIncidencia } from "../../src/application/eliminarIncidencia.js";

const CODIGO = "INC-2026-0001";
const AHORA = new Date("2026-10-15T12:00:00Z");
const sesion = { id: "1", rol: "coordinador" };
let doc, repo, llamadasEditar;

beforeEach(() => {
  doc = { codigo: CODIGO, estado: "cerrada", titulo: "Titulo viejo", evidencias_adjuntas: [] };
  llamadasEditar = [];
  repo = {
    buscarPorCodigo: async (c) => (c === doc?.codigo ? doc : null),
    editar: async ({ codigo, cambios }) => {
      llamadasEditar.push({ codigo, cambios });
      if (codigo !== doc?.codigo) return false;
      doc = { ...doc, ...cambios.$set };
      return true;
    },
    eliminar: async (c) => {
      if (c !== doc?.codigo) return false;
      doc = null;
      return true;
    },
  };
});

describe("editarIncidencia", () => {
  const editar = () => editarIncidencia({ incidenciasRepo: repo, reloj: () => AHORA });

  it("aplica solo los campos permitidos con fecha_actualizacion (incluso en cerrada)", async () => {
    const r = await editar()(sesion, CODIGO, { titulo: "Titulo corregido", prioridad: "alta" });
    expect(r.titulo).toBe("Titulo corregido");
    expect(llamadasEditar).toHaveLength(1);
    expect(llamadasEditar[0].cambios).toEqual({
      $set: { titulo: "Titulo corregido", prioridad: "alta", fecha_actualizacion: AHORA },
    });
  });

  it("cuerpo vacío -> ZodError", async () => {
    await expect(editar()(sesion, CODIGO, {})).rejects.toBeInstanceOf(ZodError);
  });

  it.each(["estado", "categoria", "reportante", "detalle_especifico"])("campo no editable %s -> ZodError", async (campo) => {
    await expect(editar()(sesion, CODIGO, { titulo: "Titulo válido", [campo]: "x" })).rejects.toBeInstanceOf(ZodError);
    expect(llamadasEditar).toHaveLength(0);
  });

  it("ubicación incompleta -> ZodError", async () => {
    await expect(editar()(sesion, CODIGO, { ubicacion: { edificio: "Rectoría" } })).rejects.toBeInstanceOf(ZodError);
  });

  it("inexistente -> NO_ENCONTRADO", async () => {
    await expect(editar()(sesion, "INC-2026-9999", { titulo: "Titulo válido" })).rejects.toMatchObject({
      codigo: "NO_ENCONTRADO",
    });
  });
});

describe("eliminarIncidencia", () => {
  let almacen;
  beforeEach(() => {
    almacen = { eliminarArchivos: vi.fn(async () => {}) };
    doc.evidencias_adjuntas = [{ storage_path: "INC-2026-0001/a.png" }, { storage_path: "INC-2026-0001/b.pdf" }];
  });
  afterEach(() => vi.restoreAllMocks());
  const eliminar = () => eliminarIncidencia({ incidenciasRepo: repo, almacen });

  it("borra el documento y los storage_path de las evidencias", async () => {
    const r = await eliminar()(sesion, CODIGO);
    expect(r).toEqual({ eliminada: true, codigo: CODIGO });
    expect(doc).toBeNull();
    expect(almacen.eliminarArchivos).toHaveBeenCalledWith(["INC-2026-0001/a.png", "INC-2026-0001/b.pdf"]);
  });

  it("si el almacén falla no rompe y registra console.error", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    almacen.eliminarArchivos = vi.fn(async () => {
      throw new Error("bucket caído");
    });
    const r = await eliminar()(sesion, CODIGO);
    expect(r).toEqual({ eliminada: true, codigo: CODIGO });
    expect(err).toHaveBeenCalledWith(expect.stringContaining(CODIGO));
  });

  it("sin evidencias no llama al almacén", async () => {
    doc.evidencias_adjuntas = [];
    await eliminar()(sesion, CODIGO);
    expect(almacen.eliminarArchivos).not.toHaveBeenCalled();
  });

  it("inexistente -> NO_ENCONTRADO y no toca el almacén", async () => {
    await expect(eliminar()(sesion, "INC-2026-9999")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect(almacen.eliminarArchivos).not.toHaveBeenCalled();
  });
});
