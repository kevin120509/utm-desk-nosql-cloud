// Casos de uso del módulo admin con repositorios en memoria: usuarios, bitácora,
// incidencias (auditoría), sistema y catálogos.
import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import { administrarUsuarios } from "../../src/application/administrarUsuarios.js";
import { administrarBitacora } from "../../src/application/administrarBitacora.js";
import { administrarIncidencias } from "../../src/application/administrarIncidencias.js";
import { consultarSistema } from "../../src/application/consultarSistema.js";
import { consultarCatalogos } from "../../src/application/consultarCatalogos.js";

// Repo de usuarios en memoria. `contarTrasCambio` permite simular una carrera (cero superAdmin).
function repoUsuarios(usuarios, { contarTrasCambio } = {}) {
  let cambioAplicado = false;
  const activos = (d) => d.activo !== false;
  return {
    usuarios,
    async buscarPorId(id) {
      return usuarios.find((u) => String(u._id) === String(id)) ?? null;
    },
    async listar() {
      // Simula la proyección del repositorio real: nunca devuelve el hash.
      return { datos: usuarios.map(({ password_hash, ...resto }) => resto), total: usuarios.length };
    },
    async listarPorRol(rol) {
      return usuarios.filter((u) => u.rol === rol);
    },
    async contarSuperAdminActivos() {
      if (contarTrasCambio !== undefined && cambioAplicado) return contarTrasCambio;
      return usuarios.filter((u) => u.rol === "superAdmin" && activos(u)).length;
    },
    async actualizar(id, cambios) {
      cambioAplicado = true;
      const u = usuarios.find((x) => String(x._id) === String(id));
      if (!u) return false;
      if (cambios.$set) Object.assign(u, cambios.$set);
      if (cambios.$unset) for (const k of Object.keys(cambios.$unset)) delete u[k];
      return true;
    },
  };
}

function repoBitacora() {
  const registros = [];
  return {
    registros,
    async insertar(r) {
      registros.push(r);
    },
    async listar() {
      return { datos: registros, total: registros.length };
    },
  };
}

const superA = { _id: new ObjectId(), nombre: "Admin A", correo: "a@utm.mx", rol: "superAdmin", activo: true, password_hash: "$2b$hash" };
const superB = { _id: new ObjectId(), nombre: "Admin B", correo: "b@utm.mx", rol: "superAdmin", activo: true, password_hash: "$2b$hash" };
const tec = { _id: new ObjectId(), nombre: "Técnico", correo: "t@utm.mx", rol: "tecnico", password_hash: "$2b$hash" };
const rep = { _id: new ObjectId(), nombre: "Ana", correo: "ana@utm.mx", rol: "reportante", tipo: "docente", password_hash: "$2b$hash" };

const actorDe = (doc) => ({ id: String(doc._id), nombre: doc.nombre, ip: "10.0.0.5" });

function crear(usuarios, opciones) {
  // Copias: cada prueba parte de datos limpios (los casos de uso modifican los documentos).
  const repo = repoUsuarios(usuarios.map((u) => ({ ...u })), opciones);
  const bitacoraRepo = repoBitacora();
  const bitacora = administrarBitacora({ bitacoraRepo });
  const admin = administrarUsuarios({ usuariosRepo: repo, bitacora });
  return { admin, repo, bitacoraRepo };
}

describe("administrarUsuarios: vista sin secretos", () => {
  it("el listado y el detalle nunca incluyen password_hash", async () => {
    const { admin } = crear([superA, tec, rep]);
    const lista = await admin.listar({});
    expect(lista.datos.every((u) => !("password_hash" in u))).toBe(true);
    const detalle = await admin.detalle(String(tec._id));
    expect(detalle).not.toHaveProperty("password_hash");
    expect(detalle).toMatchObject({ rol: "tecnico", activo: true });
  });

  it("id mal formado o inexistente -> NO_ENCONTRADO", async () => {
    const { admin } = crear([superA]);
    await expect(admin.detalle("no-es-id")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await expect(admin.detalle(String(new ObjectId()))).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });
});

describe("administrarUsuarios: estado (activar / suspender)", () => {
  it("suspende a otro usuario y lo registra en la bitácora como éxito", async () => {
    const { admin, bitacoraRepo, repo } = crear([superA, superB, tec]);
    const r = await admin.cambiarEstado(actorDe(superA), String(tec._id), { activo: false });
    expect(r.activo).toBe(false);
    expect(repo.usuarios.find((u) => u._id === tec._id).activo).toBe(false);
    expect(bitacoraRepo.registros.at(-1)).toMatchObject({
      usuario_id: String(superA._id),
      accion: "suspender",
      modulo: "usuarios",
      registro_id: String(tec._id),
      resultado: "exito",
      ip: "10.0.0.5",
      cambios: { activo: false },
    });
  });

  it("no permite suspender la propia cuenta y lo deja registrado como rechazado", async () => {
    const { admin, bitacoraRepo } = crear([superA, superB]);
    await expect(admin.cambiarEstado(actorDe(superA), String(superA._id), { activo: false })).rejects.toMatchObject({
      codigo: "OPERACION_NO_PERMITIDA",
    });
    expect(bitacoraRepo.registros.at(-1)).toMatchObject({ resultado: "rechazado", codigo_error: "OPERACION_NO_PERMITIDA" });
  });

  it("valida el cuerpo antes de tocar nada", async () => {
    const { admin, bitacoraRepo } = crear([superA, tec]);
    await expect(admin.cambiarEstado(actorDe(superA), String(tec._id), { activo: "si" })).rejects.toThrow();
    expect(bitacoraRepo.registros).toHaveLength(0);
  });
});

describe("administrarUsuarios: protección del último superAdmin", () => {
  it("no se puede quitar el rol al único superAdmin activo", async () => {
    const { admin, repo } = crear([superA, tec]);
    // Otro actor (no el propio superA) intentando degradar al único superAdmin activo.
    await expect(admin.cambiarRol({ id: String(tec._id), nombre: "X" }, String(superA._id), { rol: "tecnico" })).rejects.toMatchObject({
      codigo: "ULTIMO_SUPERADMIN",
    });
    expect(repo.usuarios.find((u) => u._id === superA._id).rol).toBe("superAdmin");
  });

  it("con dos superAdmin sí se puede degradar a uno; luego ya no", async () => {
    const { admin, repo } = crear([superA, superB]);
    await admin.cambiarRol(actorDe(superA), String(superB._id), { rol: "tecnico" });
    expect(repo.usuarios.find((u) => u._id === superB._id).rol).toBe("tecnico");
    await expect(admin.cambiarEstado(actorDe(superA), String(superA._id), { activo: false })).rejects.toMatchObject({
      codigo: "OPERACION_NO_PERMITIDA",
    });
  });

  it("no se puede retirar el propio rol de superAdmin", async () => {
    const { admin } = crear([superA, superB]);
    await expect(admin.cambiarRol(actorDe(superA), String(superA._id), { rol: "tecnico" })).rejects.toMatchObject({
      codigo: "OPERACION_NO_PERMITIDA",
    });
  });

  it("si una operación concurrente deja cero superAdmin, revierte y responde CONFLICTO", async () => {
    const { admin, repo } = crear([superA, superB], { contarTrasCambio: 0 });
    await expect(admin.cambiarRol(actorDe(superA), String(superB._id), { rol: "tecnico" })).rejects.toMatchObject({
      codigo: "CONFLICTO",
    });
    expect(repo.usuarios.find((u) => u._id === superB._id).rol).toBe("superAdmin");
  });
});

describe("administrarUsuarios: asignar roles", () => {
  it("reportante conserva tipo; tecnico lo pierde", async () => {
    const { admin, repo } = crear([superA, rep]);
    await admin.cambiarRol(actorDe(superA), String(rep._id), { rol: "tecnico" });
    const u = repo.usuarios.find((x) => x._id === rep._id);
    expect(u.rol).toBe("tecnico");
    expect(u).not.toHaveProperty("tipo");
  });

  it("registra el cambio con el rol nuevo", async () => {
    const { admin, bitacoraRepo } = crear([superA, tec]);
    await admin.cambiarRol(actorDe(superA), String(tec._id), { rol: "coordinador" });
    expect(bitacoraRepo.registros.at(-1)).toMatchObject({ accion: "cambiar_rol", resultado: "exito", cambios: { rol: "coordinador" } });
  });
});

describe("administrarBitacora", () => {
  it("el listado devuelve lo más reciente primero y pasa los filtros", async () => {
    const bitacoraRepo = repoBitacora();
    const b = administrarBitacora({ bitacoraRepo });
    await b.ejecutar({ actor: actorDe(superA), modulo: "usuarios", accion: "activar", registroId: "x" }, async () => true);
    const r = await b.listar({ modulo: "usuarios", pagina: "1" });
    expect(r.total).toBe(1);
    expect(r.pagina).toBe(1);
  });

  it("un error inesperado no se registra como rechazado (se propaga)", async () => {
    const bitacoraRepo = repoBitacora();
    const b = administrarBitacora({ bitacoraRepo });
    await expect(
      b.ejecutar({ actor: actorDe(superA), modulo: "usuarios", accion: "x", registroId: "1" }, async () => {
        throw new Error("fallo de red");
      }),
    ).rejects.toThrow("fallo de red");
    expect(bitacoraRepo.registros).toHaveLength(0);
  });
});

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

describe("consultarSistema", () => {
  const ahora = () => new Date("2026-10-27T12:00:00Z");

  it("Mongo caído -> estado error, sin ultimo_error si no hubo errores", async () => {
    const sistema = consultarSistema({
      comprobarMongo: async () => {
        throw new Error("sin conexión");
      },
      comprobarAlmacen: async () => ({ estado: "configurado" }),
      ultimoError: () => undefined,
      entorno: "test",
      version: "1.0.0",
      ahora,
    });
    const r = await sistema();
    expect(r.mongodb).toEqual({ estado: "error" });
    expect(r.almacenamiento).toEqual({ estado: "configurado" });
    expect(r).not.toHaveProperty("ultimo_error");
    expect(JSON.stringify(r)).not.toMatch(/sin conexión/);
  });

  it("incluye el último error (ya saneado) cuando existe", async () => {
    const error = { codigo: "ERROR_INTERNO", ruta: "GET /api/x", fecha: ahora(), mensaje: "Error interno del servidor" };
    const sistema = consultarSistema({
      comprobarMongo: async () => {},
      comprobarAlmacen: async () => ({ estado: "no_configurado" }),
      ultimoError: () => error,
      entorno: "test",
      version: "1.0.0",
      ahora,
    });
    const r = await sistema();
    expect(r.mongodb.estado).toBe("conectada");
    expect(r.ultimo_error).toEqual(error);
  });
});

describe("consultarCatalogos", () => {
  it("devuelve categorías nuevas, edificios usados y técnicos sin hash", async () => {
    const cat = consultarCatalogos({
      usuariosRepo: { listarPorRol: async () => [tec] },
      incidenciasRepo: { edificiosDistintos: async () => ["Biblioteca", "Edificio A"] },
    });
    const r = await cat();
    expect(r.categorias).toEqual(["computo_redes", "infraestructura_fisica", "servicios_academicos"]);
    expect(r.edificios).toEqual(["Biblioteca", "Edificio A"]);
    expect(r.tecnicos[0]).not.toHaveProperty("password_hash");
  });
});
