// Casos de uso propios del módulo admin con repositorios en memoria: vista de incidencias
// (auditoría y búsqueda). Usuarios, bitácora, catálogos y salud los cubre la versión de origin/main.
import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import { administrarIncidencias } from "../../src/application/administrarIncidencias.js";

describe("administrarIncidencias: auditoría", () => {
  const idCreador = new ObjectId();
  const idTec = new ObjectId();
  const expediente = async () => ({
    codigo: "INC-2026-0001",
    reportante: { usuario_id: idCreador, nombre: "Ana" },
    fecha_creacion: new Date("2026-10-01"),
    fecha_actualizacion: new Date("2026-10-03"),
    historial_seguimiento: [
      { autor: { usuario_id: idCreador, nombre: "Ana" }, estado_nuevo: "abierta" },
      { autor: { usuario_id: idTec, nombre: "Luis" }, estado_nuevo: "en proceso" },
    ],
  });

  it("muestra quién creó y quién modificó por última vez", async () => {
    const adm = administrarIncidencias({ incidenciasRepo: {}, expediente });
    const doc = await adm.obtener({ id: "x", nombre: "Admin" }, "INC-2026-0001");
    expect(doc.auditoria.creado_por.nombre).toBe("Ana");
    expect(doc.auditoria.ultima_modificacion.autor.nombre).toBe("Luis");
  });

  it("el listado pasa la búsqueda y los filtros al repositorio", async () => {
    let recibido;
    const adm = administrarIncidencias({
      incidenciasRepo: {
        async listarAdmin(o) {
          recibido = o;
          return { datos: [], total: 0 };
        },
      },
      expediente,
    });
    await adm.listar({ q: "filtracion", estado: "abierta" });
    expect(recibido.q).toBe("filtracion");
    expect(recibido.filtros).toEqual({ estado: "abierta" });
  });
});
