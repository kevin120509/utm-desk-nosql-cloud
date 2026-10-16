// Pruebas unitarias del caso de uso registrarIncidencia (con fakes, sin Mongo).
import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { registrarIncidencia } from "../../src/application/registrarIncidencia.js";

const AHORA = new Date("2026-03-10T15:00:00Z");
const idUsuario = new ObjectId();

const base = {
  titulo: "Switch del laboratorio sin respuesta",
  descripcion: "Desde las 8:00 los equipos no obtienen red.",
  prioridad: "alta",
  ubicacion: { edificio: "Laboratorios de Cómputo", piso: 1, espacio: "LC-2" },
  categoria: "computo_redes",
  detalle_especifico: {
    tipo_falla: "switch",
    direccion_ip: "10.20.2.1",
    vlan: 20,
    puerto_uplink: "Gi1/0/24",
    equipos_afectados: 28,
  },
};

function crear(usuario = { _id: idUsuario, nombre: "Ana Pech", correo: "ana@utm.mx", rol: "reportante", tipo: "docente", activo: true }) {
  const insertados = [];
  let diario = 0;
  let anual = 0;
  const incidenciasRepo = { insertar: async (doc) => (insertados.push(doc), { _id: new ObjectId(), ...doc }) };
  const contador = {
    siguienteDiario: async () => ++diario,
    siguienteAnual: async () => ++anual,
  };
  const usuariosRepo = { buscarPorId: async (id) => (String(id) === String(idUsuario) ? usuario : null) };
  const registrar = registrarIncidencia({ incidenciasRepo, contador, usuariosRepo, reloj: () => AHORA });
  return { registrar, insertados };
}

describe("registrarIncidencia", () => {
  it("arma el documento exacto del plan §4.1", async () => {
    const { registrar, insertados } = crear();
    const doc = await registrar({ id: String(idUsuario), rol: "reportante", nombre: "Ana Pech" }, base);
    expect(doc._id).toBeDefined();
    expect(insertados[0]).toEqual({
      codigo: "INC-2026-0001",
      consecutivo_diario: 1,
      titulo: base.titulo,
      descripcion: base.descripcion,
      categoria: "computo_redes",
      prioridad: "alta",
      estado: "abierta",
      reportante: { usuario_id: idUsuario, nombre: "Ana Pech", tipo: "docente", correo: "ana@utm.mx" },
      ubicacion: base.ubicacion,
      detalle_especifico: base.detalle_especifico,
      tags: [],
      historial_seguimiento: [
        {
          fecha: AHORA,
          autor: { usuario_id: idUsuario, nombre: "Ana Pech" },
          estado_nuevo: "abierta",
          comentario: "Incidencia registrada",
          horas: 0,
        },
      ],
      evidencias_adjuntas: [],
      horas_invertidas: 0,
      fecha_creacion: AHORA,
      fecha_actualizacion: AHORA,
    });
  });

  it("toma el reportante de la sesión, nunca del cuerpo", async () => {
    const { registrar } = crear();
    // Un campo `reportante` en el cuerpo es rechazado (esquema estricto).
    await expect(
      registrar({ id: String(idUsuario) }, { ...base, reportante: { nombre: "Otro" } }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("dos altas seguidas generan códigos y consecutivos distintos", async () => {
    const { registrar } = crear();
    const sesion = { id: String(idUsuario) };
    const a = await registrar(sesion, base);
    const b = await registrar(sesion, base);
    expect(a.codigo).not.toBe(b.codigo);
    expect(b.codigo).toBe("INC-2026-0002");
    expect(b.consecutivo_diario).toBe(2);
  });

  it("no genera claves null ni fecha_resolucion ni asignado_a", async () => {
    const { registrar } = crear();
    const doc = await registrar({ id: String(idUsuario) }, base);
    expect(JSON.stringify(doc)).not.toContain("null");
    expect(doc).not.toHaveProperty("fecha_resolucion");
    expect(doc).not.toHaveProperty("asignado_a");
  });

  it("personal sin tipo queda como administrativo", async () => {
    const { registrar } = crear({ _id: idUsuario, nombre: "Luis", correo: "luis@utm.mx", rol: "tecnico", activo: true });
    const doc = await registrar({ id: String(idUsuario) }, base);
    expect(doc.reportante.tipo).toBe("administrativo");
  });

  it("usuario inexistente o inactivo: NO_AUTENTICADO", async () => {
    const { registrar } = crear();
    await expect(registrar({ id: String(new ObjectId()) }, base)).rejects.toMatchObject({ codigo: "NO_AUTENTICADO" });
    const { registrar: r2 } = crear({ _id: idUsuario, nombre: "X", correo: "x@utm.mx", rol: "reportante", tipo: "docente", activo: false });
    await expect(r2({ id: String(idUsuario) }, base)).rejects.toMatchObject({ codigo: "NO_AUTENTICADO" });
  });
});
