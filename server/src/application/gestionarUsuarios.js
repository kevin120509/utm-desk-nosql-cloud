// Casos de uso del superAdmin sobre usuarios y roles ("CRUD controlado"):
// crear, consultar, actualizar y activar/suspender; NUNCA borrar. Cada cambio queda en la bitácora.
import { z } from "zod";
import { ROLES, TIPOS_REPORTANTE, CATEGORIAS } from "../domain/index.js";
import { ErrorApp } from "./errores.js";
import { usuarioPublico } from "./autenticar.js";

const nombreSchema = z.string({ error: "El nombre es obligatorio" }).trim().min(2, "El nombre es muy corto").max(120);
const correoSchema = z
  .string({ error: "El correo es obligatorio" })
  .trim()
  .toLowerCase()
  .min(1, "El correo es obligatorio")
  .email("Correo inválido");
export const passwordSchema = z
  .string({ error: "La contraseña es obligatoria" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga");
const rolSchema = z.enum(ROLES, { error: "Rol inválido" });
const tipoSchema = z.enum(TIPOS_REPORTANTE, { error: "Tipo inválido" });

const crearSchema = z
  .strictObject({ nombre: nombreSchema, correo: correoSchema, password: passwordSchema, rol: rolSchema, tipo: tipoSchema.optional() })
  .refine((d) => d.rol !== "reportante" || d.tipo, { path: ["tipo"], message: "El tipo es obligatorio para un reportante" });
const actualizarSchema = z
  .strictObject({ nombre: nombreSchema.optional(), tipo: tipoSchema.optional() })
  .refine((d) => d.nombre !== undefined || d.tipo !== undefined, { message: "No hay nada que actualizar" });
const tecnicoSchema = z
  .strictObject({
    disponible: z.boolean({ error: "Indica si el técnico está disponible" }).optional(),
    categorias: z.array(z.enum(CATEGORIAS, { error: "Categoría inválida" })).max(CATEGORIAS.length).optional(),
  })
  .refine((d) => d.disponible !== undefined || d.categorias !== undefined, { message: "No hay nada que actualizar" });
const cambiarRolSchema =z.strictObject({ rol: rolSchema, tipo: tipoSchema.optional() });
const estadoSchema = z.strictObject({ activo: z.boolean({ error: "Indica si el usuario queda activo" }) });
const consultaSchema = z.object({
  q: z.string().trim().max(80).optional(),
  rol: rolSchema.optional(),
  activo: z.enum(["true", "false"]).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});

const vista = (doc) => {
  const base = { ...usuarioPublico(doc), activo: doc.activo !== false };
  // Datos propios de los técnicos: disponibilidad y categorías que atienden.
  if (doc.rol === "tecnico") {
    base.disponible = doc.disponible !== false;
    base.categorias = doc.categorias_atiende ?? [];
  }
  return base;
};

/**
 * @param {{usuariosRepo: object, hasher: {hashear: Function}, auditor: {registrarAdmin: Function}, reloj?: () => Date}} deps
 */
export function gestionarUsuarios({ usuariosRepo, hasher, auditor, reloj = () => new Date() }) {
  async function cargar(id) {
    const doc = await usuariosRepo.buscarPorId(id);
    if (!doc) throw new ErrorApp("NO_ENCONTRADO", "El usuario no existe");
    return doc;
  }

  // No se puede dejar el sistema sin superAdmin activo.
  async function exigirOtroSuperAdmin(doc) {
    if (doc.rol === "superAdmin" && doc.activo !== false && (await usuariosRepo.contarSuperAdminsActivos()) <= 1) {
      throw new ErrorApp("CONFLICTO", "No se puede dejar el sistema sin un superAdmin activo");
    }
  }

  return {
    async listar(_sesion, query) {
      const f = consultaSchema.parse(query ?? {});
      const { datos, total } = await usuariosRepo.listar({
        q: f.q || undefined,
        rol: f.rol,
        activo: f.activo === undefined ? undefined : f.activo === "true",
        pagina: f.pagina,
        limite: f.limite,
      });
      return { datos: datos.map(vista), total, pagina: f.pagina };
    },

    async obtener(_sesion, id) {
      return { usuario: vista(await cargar(id)) };
    },

    async crear(sesion, entrada) {
      const d = crearSchema.parse(entrada ?? {});
      const doc = {
        nombre: d.nombre,
        correo: d.correo,
        password_hash: await hasher.hashear(d.password),
        rol: d.rol,
        activo: true,
        fecha_creacion: reloj(),
      };
      if (d.rol === "reportante") doc.tipo = d.tipo;
      let creado;
      try {
        creado = await usuariosRepo.insertar(doc);
      } catch (e) {
        if (e?.codigo === "CORREO_DUPLICADO") throw new ErrorApp("CONFLICTO", "Ese correo ya está registrado");
        throw e;
      }
      await auditor.registrarAdmin("usuario.crear", sesion, { tipo: "usuario", id: String(creado._id) }, { correo: d.correo, rol: d.rol });
      return { usuario: vista(creado) };
    },

    async actualizar(sesion, id, entrada) {
      const d = actualizarSchema.parse(entrada ?? {});
      const doc = await cargar(id);
      if (d.tipo !== undefined && doc.rol !== "reportante") {
        throw new ErrorApp("VALIDACION", "Solo un reportante tiene tipo");
      }
      const $set = {};
      if (d.nombre !== undefined) $set.nombre = d.nombre;
      if (d.tipo !== undefined) $set.tipo = d.tipo;
      await usuariosRepo.actualizar(id, { $set });
      await auditor.registrarAdmin("usuario.actualizar", sesion, { tipo: "usuario", id }, { cambios: Object.keys($set) });
      return { usuario: vista(await cargar(id)) };
    },

    async actualizarTecnico(sesion, id, entrada) {
      const d = tecnicoSchema.parse(entrada ?? {});
      const doc = await cargar(id);
      if (doc.rol !== "tecnico") throw new ErrorApp("VALIDACION", "El usuario no es técnico");
      const $set = {};
      if (d.disponible !== undefined) $set.disponible = d.disponible;
      if (d.categorias !== undefined) $set.categorias_atiende = [...new Set(d.categorias)];
      await usuariosRepo.actualizar(id, { $set });
      await auditor.registrarAdmin("tecnico.actualizar", sesion, { tipo: "usuario", id }, d);
      return { usuario: vista(await cargar(id)) };
    },

    async cambiarRol(sesion, id, entrada) {
      const d = cambiarRolSchema.parse(entrada ?? {});
      if (String(id) === String(sesion.id)) {
        throw new ErrorApp("SIN_PERMISO", "No puedes cambiar tu propio rol");
      }
      const doc = await cargar(id);
      if (doc.rol === d.rol) return { usuario: vista(doc) };
      if (d.rol !== "superAdmin") await exigirOtroSuperAdmin(doc);

      const rolAnterior = doc.rol;
      const cambios = { $set: { rol: d.rol } };
      if (d.rol === "reportante") {
        const tipo = d.tipo ?? doc.tipo;
        if (!tipo) throw new ErrorApp("VALIDACION", "El tipo es obligatorio para un reportante");
        cambios.$set.tipo = tipo;
      } else if (doc.tipo) {
        cambios.$unset = { tipo: "" };
      }
      // Los datos de técnico no tienen sentido en otro rol.
      if (doc.rol === "tecnico") cambios.$unset = { ...(cambios.$unset ?? {}), disponible: "", categorias_atiende: "" };
      await usuariosRepo.actualizar(id, cambios);
      await auditor.registrarAdmin("usuario.cambiar_rol", sesion, { tipo: "usuario", id }, { de: rolAnterior, a: d.rol });
      return { usuario: vista(await cargar(id)) };
    },

    async cambiarEstado(sesion, id, entrada) {
      const { activo } = estadoSchema.parse(entrada ?? {});
      if (!activo && String(id) === String(sesion.id)) {
        throw new ErrorApp("SIN_PERMISO", "No puedes suspender tu propia cuenta");
      }
      const doc = await cargar(id);
      if ((doc.activo !== false) === activo) return { usuario: vista(doc) };
      if (!activo) await exigirOtroSuperAdmin(doc);
      await usuariosRepo.actualizar(id, { $set: { activo } });
      await auditor.registrarAdmin(activo ? "usuario.activar" : "usuario.suspender", sesion, { tipo: "usuario", id }, { correo: doc.correo });
      return { usuario: vista(await cargar(id)) };
    },
  };
}
