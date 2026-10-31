// Pruebas unitarias del caso de uso actualizarEstado (fakes, sin Mongo).
import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { actualizarEstado } from "../../src/application/actualizarEstado.js";

const AHORA = new Date("2026-03-10T15:00:00Z");
const FECHA_RES = new Date("2026-03-09T10:00:00Z");
const idTec = new ObjectId();
const idCoord = new ObjectId();
const usuarios = [
  { _id: idTec, nombre: "Tec Uno", rol: "tecnico", activo: true },
  { _id: idCoord, nombre: "Coord Uno", rol: "coordinador", activo: true },
];
const tec = { id: String(idTec), rol: "tecnico", nombre: "Tec Uno" };
const coord = { id: String(idCoord), rol: "coordinador", nombre: "Coord Uno" };
const CODIGO = "INC-2026-0001";

// Fabrica el caso de uso con un repo falso que registra las llamadas.
function crear(docExtra = {}, { aplicado = true } = {}) {
  const llamadas = [];
  const doc = { _id: new ObjectId(), codigo: CODIGO, estado: "abierta", horas_invertidas: 0, ...docExtra };
  const incidenciasRepo = {
    buscarPorCodigo: async (c) => (c === CODIGO ? doc : null),
    actualizarEstado: async (datos) => (llamadas.push(datos), aplicado),
  };
  const usuariosRepo = { buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null };
  return { actualizar: actualizarEstado({ incidenciasRepo, usuariosRepo, reloj: () => AHORA }), llamadas };
}
const entrada = (estado_nuevo, extra = {}) => ({ estado_nuevo, horas: 1.5, comentario: "Se revisó el equipo", ...extra });

describe("actualizarEstado", () => {
  const permitidas = [
    ["abierta", "en proceso"], ["abierta", "en espera"], ["abierta", "resuelta"],
    ["en proceso", "abierta"], ["en proceso", "en espera"], ["en proceso", "resuelta"],
    ["en espera", "abierta"], ["en espera", "en proceso"], ["en espera", "resuelta"],
  ];
  it.each(permitidas)("técnico: %s -> %s", async (desde, hacia) => {
    const { actualizar, llamadas } = crear({ estado: desde });
    await actualizar(tec, CODIGO, entrada(hacia));
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].codigo).toBe(CODIGO);
    expect(llamadas[0].estadoLeido).toBe(desde);
    expect(llamadas[0].cambios.$set.estado).toBe(hacia);
  });

  it("coordinador: resuelta -> cerrada", async () => {
    const { actualizar, llamadas } = crear({ estado: "resuelta", fecha_resolucion: FECHA_RES });
    await actualizar(coord, CODIGO, entrada("cerrada"));
    expect(llamadas[0].cambios.$set.estado).toBe("cerrada");
  });

  it("transición inválida: lanza TRANSICION_INVALIDA y no escribe", async () => {
    for (const [desde, hacia] of [["abierta", "abierta"], ["abierta", "cerrada"], ["resuelta", "abierta"], ["cerrada", "abierta"]]) {
      const { actualizar, llamadas } = crear({ estado: desde });
      await expect(actualizar(coord, CODIGO, entrada(hacia))).rejects.toMatchObject({ codigo: "TRANSICION_INVALIDA" });
      expect(llamadas).toHaveLength(0);
    }
  });

  it("cerrar es solo del coordinador", async () => {
    const { actualizar, llamadas } = crear({ estado: "resuelta", fecha_resolucion: FECHA_RES });
    await expect(actualizar(tec, CODIGO, entrada("cerrada"))).rejects.toMatchObject({ codigo: "TRANSICION_INVALIDA" });
    expect(llamadas).toHaveLength(0);
  });

  it("arma $set, $push e $inc como el plan", async () => {
    const { actualizar, llamadas } = crear();
    await actualizar(tec, CODIGO, entrada("en proceso"));
    const { $set, $push, $inc } = llamadas[0].cambios;
    expect($set.fecha_actualizacion).toEqual(AHORA);
    expect($push.historial_seguimiento).toEqual({
      fecha: AHORA,
      autor: { usuario_id: idTec, nombre: "Tec Uno" },
      estado_anterior: "abierta",
      estado_nuevo: "en proceso",
      comentario: "Se revisó el equipo",
      horas: 1.5,
    });
    expect($inc).toEqual({ horas_invertidas: 1.5 });
  });

  it("fecha_resolucion solo al pasar a resuelta", async () => {
    const a = crear();
    await a.actualizar(tec, CODIGO, entrada("resuelta"));
    expect(a.llamadas[0].cambios.$set.fecha_resolucion).toEqual(AHORA);
    const b = crear();
    await b.actualizar(tec, CODIGO, entrada("en proceso"));
    expect(b.llamadas[0].cambios.$set).not.toHaveProperty("fecha_resolucion");
  });

  it("al cerrar se conserva fecha_resolucion (no se toca)", async () => {
    const { actualizar, llamadas } = crear({ estado: "resuelta", fecha_resolucion: FECHA_RES });
    await actualizar(coord, CODIGO, entrada("cerrada"));
    expect(llamadas[0].cambios.$set).not.toHaveProperty("fecha_resolucion");
  });

  it("no asigna automáticamente: la asignación corresponde al coordinador", async () => {
    const a = crear();
    await a.actualizar(tec, CODIGO, entrada("en proceso"));
    expect(a.llamadas[0].cambios.$set).not.toHaveProperty("asignado_a");

    const b = crear();
    await b.actualizar(coord, CODIGO, entrada("en proceso"));
    expect(b.llamadas[0].cambios.$set).not.toHaveProperty("asignado_a");
  });

  it("409 CONFLICTO cuando el repo no aplica el cambio", async () => {
    const { actualizar } = crear({}, { aplicado: false });
    await expect(actualizar(tec, CODIGO, entrada("en proceso"))).rejects.toMatchObject({ codigo: "CONFLICTO" });
  });

  it("código inexistente o con mala forma: NO_ENCONTRADO", async () => {
    const { actualizar, llamadas } = crear();
    await expect(actualizar(tec, "INC-2026-9999", entrada("en proceso"))).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await expect(actualizar(tec, "buscar", entrada("en proceso"))).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect(llamadas).toHaveLength(0);
  });

  it("horas negativas, 25 o NaN -> ZodError y no se toca el repo", async () => {
    for (const horas of [-1, 25, NaN]) {
      let usos = 0;
      const repo = {
        buscarPorCodigo: async () => (usos++, null),
        actualizarEstado: async () => (usos++, true),
      };
      const usuariosRepo = { buscarPorId: async () => (usos++, null) };
      const actualizar = actualizarEstado({ incidenciasRepo: repo, usuariosRepo });
      await expect(actualizar(tec, CODIGO, entrada("en proceso", { horas }))).rejects.toBeInstanceOf(ZodError);
      expect(usos).toBe(0);
    }
  });
});
