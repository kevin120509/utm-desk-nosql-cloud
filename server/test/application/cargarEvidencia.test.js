// Caso de uso cargarEvidencia con almacén y repositorio falsos (detección de tipo real).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cargarEvidencia } from "../../src/application/cargarEvidencia.js";
import { detectarTipo } from "../../src/infrastructure/archivos/detectarTipo.js";
import { MAX_BYTES_EVIDENCIA } from "../../src/domain/index.js";
import { PNG, JPEG, PDF, EXE, TEXTO } from "../fixtures/archivos.js";

const AHORA = new Date("2026-10-15T12:00:00Z");
const DUENO = "665f1c2e9b1e8a0012345678";

let almacen, repo, cargar;

beforeEach(() => {
  almacen = {
    subir: vi.fn(async () => {}),
    urlFirmada: vi.fn(async (ruta, seg) => ({ url: `https://firmada/${ruta}`, expira: new Date(AHORA.getTime() + seg * 1000) })),
    eliminarArchivos: vi.fn(async () => {}),
  };
  repo = {
    buscarPorCodigo: vi.fn(async (codigo) =>
      codigo === "INC-2026-0001" ? { codigo, reportante: { usuario_id: DUENO } } : null,
    ),
    agregarEvidencia: vi.fn(async () => true),
  };
  cargar = cargarEvidencia({
    incidenciasRepo: repo,
    almacen,
    detectarTipo,
    ttlSegundos: 600,
    reloj: () => AHORA,
    generarId: () => "uuid-fijo",
  });
});

const staff = { id: "t1", rol: "tecnico" };
const dueno = { id: DUENO, rol: "reportante" };
const archivo = (buffer, originalname = "foto.png") => ({ originalname, buffer, size: buffer.length });

describe("cargarEvidencia: casos válidos", () => {
  it.each([
    ["PNG", PNG, "image/png", "foto.png"],
    ["JPEG", JPEG, "image/jpeg", "foto.jpg"],
    ["PDF", PDF, "application/pdf", "foto.pdf"],
  ])("sube un %s, firma la URL y hace $push con los metadatos", async (_n, buffer, mime, nombreEsperado) => {
    const ev = await cargar(staff, "INC-2026-0001", archivo(buffer, "foto.png"));
    expect(almacen.subir).toHaveBeenCalledWith({
      ruta: `INC-2026-0001/uuid-fijo-${nombreEsperado}`,
      buffer,
      tipoMime: mime,
    });
    expect(ev).toEqual({
      nombre_archivo: nombreEsperado,
      tipo_mime: mime, // el detectado, no el declarado
      peso_kb: expect.any(Number),
      storage_path: `INC-2026-0001/uuid-fijo-${nombreEsperado}`,
      url_storage: `https://firmada/INC-2026-0001/uuid-fijo-${nombreEsperado}`,
      url_expira: new Date(AHORA.getTime() + 600 * 1000),
      fecha_carga: AHORA,
    });
    expect(repo.agregarEvidencia).toHaveBeenCalledWith("INC-2026-0001", ev, AHORA);
    expect(JSON.stringify(ev)).not.toContain("null");
  });

  it("el reportante dueño y el coordinador también pueden", async () => {
    await expect(cargar(dueno, "INC-2026-0001", archivo(PNG))).resolves.toBeTruthy();
    await expect(cargar({ id: "c1", rol: "coordinador" }, "INC-2026-0001", archivo(PNG))).resolves.toBeTruthy();
  });
});

describe("cargarEvidencia: rechazos (nunca se sube nada)", () => {
  it.each([
    ["sin archivo", null],
    ["archivo de 0 bytes", archivo(Buffer.alloc(0))],
    ["ejecutable renombrado como .png", archivo(EXE, "inofensivo.png")],
    ["texto plano", archivo(TEXTO, "nota.pdf")],
    ["mayor a 4 MB", archivo(Buffer.concat([PNG, Buffer.alloc(MAX_BYTES_EVIDENCIA)]), "grande.png")],
  ])("%s -> ARCHIVO_INVALIDO y no se llama al almacén", async (_n, a) => {
    await expect(cargar(staff, "INC-2026-0001", a)).rejects.toMatchObject({ codigo: "ARCHIVO_INVALIDO" });
    expect(almacen.subir).not.toHaveBeenCalled();
    expect(repo.agregarEvidencia).not.toHaveBeenCalled();
  });

  it("exactamente 4 MB sí se acepta", async () => {
    const justo = Buffer.concat([PNG, Buffer.alloc(MAX_BYTES_EVIDENCIA - PNG.length)]);
    expect(justo.length).toBe(MAX_BYTES_EVIDENCIA);
    await expect(cargar(staff, "INC-2026-0001", archivo(justo))).resolves.toBeTruthy();
  });

  it("incidencia inexistente o código mal formado -> NO_ENCONTRADO sin validar ni subir", async () => {
    await expect(cargar(staff, "INC-2026-9999", archivo(PNG))).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await expect(cargar(staff, "buscar", archivo(PNG))).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect(almacen.subir).not.toHaveBeenCalled();
  });

  it("reportante ajeno y directivo -> SIN_PERMISO", async () => {
    await expect(cargar({ id: "otro", rol: "reportante" }, "INC-2026-0001", archivo(PNG))).rejects.toMatchObject({
      codigo: "SIN_PERMISO",
    });
    await expect(cargar({ id: "d1", rol: "directivo" }, "INC-2026-0001", archivo(PNG))).rejects.toMatchObject({
      codigo: "SIN_PERMISO",
    });
    expect(almacen.subir).not.toHaveBeenCalled();
  });
});

describe("cargarEvidencia: fallos de infraestructura", () => {
  it("si el $push falla después de subir, borra el archivo huérfano y relanza", async () => {
    repo.agregarEvidencia = vi.fn(async () => {
      throw new Error("Mongo caído");
    });
    await expect(cargar(staff, "INC-2026-0001", archivo(PNG))).rejects.toThrow("Mongo caído");
    expect(almacen.eliminarArchivos).toHaveBeenCalledWith(["INC-2026-0001/uuid-fijo-foto.png"]);
  });

  it("si la incidencia desaparece entre la lectura y el push -> NO_ENCONTRADO y limpia", async () => {
    repo.agregarEvidencia = vi.fn(async () => false);
    await expect(cargar(staff, "INC-2026-0001", archivo(PNG))).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect(almacen.eliminarArchivos).toHaveBeenCalledTimes(1);
  });

  it("si el almacén falla al subir no se toca Mongo", async () => {
    almacen.subir = vi.fn(async () => {
      throw new Error("Storage caído");
    });
    await expect(cargar(staff, "INC-2026-0001", archivo(PNG))).rejects.toThrow("Storage caído");
    expect(repo.agregarEvidencia).not.toHaveBeenCalled();
  });
});
