import { describe, it, expect, vi } from "vitest";
import { ZodError } from "zod";
import { gestionarEtiquetas } from "../../src/application/gestionarEtiquetas.js";

const AHORA = new Date("2026-10-15T12:00:00Z");

function repoFalso(tags = ["switch"]) {
  return {
    agregar: vi.fn(async (_c, tag) => (tags.includes(tag) ? tags : [...tags, tag])),
    quitar: vi.fn(async (_c, tag) => tags.filter((t) => t !== tag)),
  };
}

const sesion = { id: "t1", rol: "tecnico" };

describe("gestionarEtiquetas.agregar", () => {
  it("normaliza a minúsculas y sin espacios antes de llamar al repo", async () => {
    const repo = repoFalso([]);
    const g = gestionarEtiquetas({ etiquetasRepo: repo, reloj: () => AHORA });
    const r = await g.agregar(sesion, "INC-2026-0001", { tag: "  Switch " });
    expect(repo.agregar).toHaveBeenCalledWith("INC-2026-0001", "switch", AHORA);
    expect(r).toEqual({ tags: ["switch"] });
  });

  it("repetir la etiqueta con otro formato no duplica", async () => {
    const repo = repoFalso(["switch"]);
    const g = gestionarEtiquetas({ etiquetasRepo: repo });
    const r = await g.agregar(sesion, "INC-2026-0001", { tag: "SWITCH" });
    expect(r.tags).toEqual(["switch"]);
  });

  it.each([[{ tag: "a" }], [{ tag: "x".repeat(41) }], [{}], [{ tag: 5 }], [{ tag: "ok", extra: 1 }]])(
    "cuerpo inválido %j -> ZodError y no toca la BD",
    async (cuerpo) => {
      const repo = repoFalso();
      const g = gestionarEtiquetas({ etiquetasRepo: repo });
      await expect(g.agregar(sesion, "INC-2026-0001", cuerpo)).rejects.toBeInstanceOf(ZodError);
      expect(repo.agregar).not.toHaveBeenCalled();
    },
  );

  it("NO_ENCONTRADO si la incidencia no existe (repo devuelve null)", async () => {
    const repo = { agregar: vi.fn(async () => null), quitar: vi.fn() };
    const g = gestionarEtiquetas({ etiquetasRepo: repo });
    await expect(g.agregar(sesion, "INC-2026-9999", { tag: "wifi" })).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });

  it("NO_ENCONTRADO sin tocar la BD si el código tiene mala forma", async () => {
    const repo = repoFalso();
    const g = gestionarEtiquetas({ etiquetasRepo: repo });
    await expect(g.agregar(sesion, "buscar", { tag: "wifi" })).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect(repo.agregar).not.toHaveBeenCalled();
  });
});

describe("gestionarEtiquetas.quitar", () => {
  it("normaliza el tag de la URL y devuelve los tags restantes", async () => {
    const repo = repoFalso(["switch", "sin-red"]);
    const g = gestionarEtiquetas({ etiquetasRepo: repo, reloj: () => AHORA });
    const r = await g.quitar(sesion, "INC-2026-0001", " Sin-Red ");
    expect(repo.quitar).toHaveBeenCalledWith("INC-2026-0001", "sin-red", AHORA);
    expect(r).toEqual({ tags: ["switch"] });
  });

  it("tag inválido -> ZodError", async () => {
    const g = gestionarEtiquetas({ etiquetasRepo: repoFalso() });
    await expect(g.quitar(sesion, "INC-2026-0001", "x")).rejects.toBeInstanceOf(ZodError);
  });

  it("NO_ENCONTRADO si la incidencia no existe", async () => {
    const repo = { agregar: vi.fn(), quitar: vi.fn(async () => null) };
    const g = gestionarEtiquetas({ etiquetasRepo: repo });
    await expect(g.quitar(sesion, "INC-2026-9999", "wifi")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });
});
