// Caso de uso de búsqueda textual (RF-09) con repositorio falso.
import { describe, it, expect, vi } from "vitest";
import { ZodError } from "zod";
import { buscarIncidencias } from "../../src/application/buscarIncidencias.js";

const repoFalso = (datos = []) => ({ buscarTexto: vi.fn(async () => datos) });

describe("buscarIncidencias", () => {
  it("el personal busca sin límite de propietario y recibe { datos }", async () => {
    const datos = [{ codigo: "INC-2026-0001", score: 1.5 }];
    const repo = repoFalso(datos);
    const res = await buscarIncidencias({ incidenciasRepo: repo })({ id: "t1", rol: "tecnico" }, { q: "  filtración " });
    expect(res).toEqual({ datos });
    // q llega recortado y el límite es fijo (20).
    expect(repo.buscarTexto).toHaveBeenCalledWith({ q: "filtración", propietarioId: undefined, limite: 20 });
  });

  it.each(["coordinador", "directivo"])("el rol %s no se limita", async (rol) => {
    const repo = repoFalso();
    await buscarIncidencias({ incidenciasRepo: repo })({ id: "x", rol }, { q: "red" });
    expect(repo.buscarTexto.mock.calls[0][0].propietarioId).toBeUndefined();
  });

  it("un reportante queda limitado a su propio id", async () => {
    const repo = repoFalso();
    await buscarIncidencias({ incidenciasRepo: repo })({ id: "r1", rol: "reportante" }, { q: "red" });
    expect(repo.buscarTexto.mock.calls[0][0].propietarioId).toBe("r1");
  });

  it.each([
    [{}],
    [{ q: "" }],
    [{ q: "    " }],
    [{ q: "a".repeat(101) }],
    [{ q: "red", otro: "1" }],
    [undefined],
  ])("rechaza %j con ZodError y no consulta el repositorio", async (query) => {
    const repo = repoFalso();
    await expect(buscarIncidencias({ incidenciasRepo: repo })({ id: "t1", rol: "tecnico" }, query)).rejects.toBeInstanceOf(ZodError);
    expect(repo.buscarTexto).not.toHaveBeenCalled();
  });

  it("acepta q de exactamente 100 caracteres", async () => {
    const repo = repoFalso();
    await buscarIncidencias({ incidenciasRepo: repo })({ id: "t1", rol: "tecnico" }, { q: "a".repeat(100) });
    expect(repo.buscarTexto).toHaveBeenCalledTimes(1);
  });
});
