// Caso de uso: administración de usuarios (estado y rol) con protección del último superAdmin.
import { ErrorApp } from "./errores.js";
import {
  PATRON_ID_USUARIO,
  adminUsuariosQuerySchema,
  cambiarEstadoUsuarioSchema,
  cambiarRolUsuarioSchema,
} from "../domain/administracion.js";

const MODULO = "usuarios";

// Vista administrativa del usuario: nunca incluye password_hash.
export function vistaUsuario(doc) {
  const vista = {
    id: String(doc._id),
    nombre: doc.nombre,
    correo: doc.correo,
    rol: doc.rol,
    activo: doc.activo !== false,
  };
  if (doc.tipo) vista.tipo = doc.tipo;
  return vista;
}

/**
 * @param {{usuariosRepo: object, bitacora: {ejecutar: Function}}} deps
 */
export function administrarUsuarios({ usuariosRepo, bitacora }) {
  async function obtenerExistente(id) {
    if (!PATRON_ID_USUARIO.test(String(id))) throw new ErrorApp("NO_ENCONTRADO", "El usuario no existe");
    const doc = await usuariosRepo.buscarPorId(id);
    if (!doc) throw new ErrorApp("NO_ENCONTRADO", "El usuario no existe");
    return doc;
  }

  // Un superAdmin activo (no el que se quiere quitar) debe seguir existiendo.
  async function protegerUltimoSuperAdmin() {
    if ((await usuariosRepo.contarSuperAdminActivos()) <= 1) {
      throw new ErrorApp("ULTIMO_SUPERADMIN", "No se puede quitar al último superAdmin activo");
    }
  }

  return {
    async listar(query) {
      const filtros = adminUsuariosQuerySchema.parse(query ?? {});
      const { datos, total } = await usuariosRepo.listar(filtros);
      return { datos: datos.map(vistaUsuario), total, pagina: filtros.pagina };
    },

    async detalle(id) {
      return vistaUsuario(await obtenerExistente(id));
    },

    /** Activa o suspende (desactivación lógica; nunca se borra un usuario). */
    async cambiarEstado(actor, id, cuerpo) {
      const { activo } = cambiarEstadoUsuarioSchema.parse(cuerpo ?? {});
      return bitacora.ejecutar(
        { actor, modulo: MODULO, accion: activo ? "activar" : "suspender", registroId: id, cambios: { activo } },
        async () => {
          const doc = await obtenerExistente(id);
          if (!activo && String(doc._id) === actor.id) {
            throw new ErrorApp("OPERACION_NO_PERMITIDA", "No puedes suspender tu propia cuenta");
          }
          const quitaSuperAdmin = doc.rol === "superAdmin" && doc.activo !== false && !activo;
          if (quitaSuperAdmin) await protegerUltimoSuperAdmin();

          await usuariosRepo.actualizar(id, { $set: { activo } });

          // Comprobación posterior: si dos operaciones concurrentes dejaron cero superAdmin, se revierte.
          if (quitaSuperAdmin && (await usuariosRepo.contarSuperAdminActivos()) === 0) {
            await usuariosRepo.actualizar(id, { $set: { activo: true } });
            throw new ErrorApp("CONFLICTO", "Otra operación cambió los superAdmin al mismo tiempo. Intenta de nuevo");
          }
          return vistaUsuario({ ...doc, activo });
        },
      );
    },

    /**
     * Asigna el rol de un usuario (retirar un rol = asignarle otro). `tipo` solo para reportantes.
     */
    async cambiarRol(actor, id, cuerpo) {
      const { rol, tipo } = cambiarRolUsuarioSchema.parse(cuerpo ?? {});
      return bitacora.ejecutar(
        {
          actor,
          modulo: MODULO,
          accion: "cambiar_rol",
          registroId: id,
          cambios: tipo ? { rol, tipo } : { rol },
        },
        async () => {
          const doc = await obtenerExistente(id);
          const eraSuperAdmin = doc.rol === "superAdmin" && doc.activo !== false;
          const quitaSuperAdmin = eraSuperAdmin && rol !== "superAdmin";
          if (quitaSuperAdmin && String(doc._id) === actor.id) {
            throw new ErrorApp("OPERACION_NO_PERMITIDA", "No puedes retirarte tu propio rol de superAdmin");
          }
          if (quitaSuperAdmin) await protegerUltimoSuperAdmin();

          const cambios = rol === "reportante" ? { $set: { rol, tipo } } : { $set: { rol }, $unset: { tipo: "" } };
          await usuariosRepo.actualizar(id, cambios);

          if (quitaSuperAdmin && (await usuariosRepo.contarSuperAdminActivos()) === 0) {
            await usuariosRepo.actualizar(id, { $set: { rol: "superAdmin" }, $unset: { tipo: "" } });
            throw new ErrorApp("CONFLICTO", "Otra operación cambió los superAdmin al mismo tiempo. Intenta de nuevo");
          }
          return vistaUsuario({ ...doc, rol, tipo: rol === "reportante" ? tipo : undefined });
        },
      );
    },
  };
}
