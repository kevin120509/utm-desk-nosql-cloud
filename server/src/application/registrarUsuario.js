// Registro público: cualquiera puede crear una cuenta, y SIEMPRE nace como reportante.
// El esquema es estricto: si el cuerpo trae `rol` (o cualquier campo extra) se rechaza con 400.
import { z } from "zod";
import { TIPOS_REPORTANTE } from "../domain/index.js";
import { ErrorApp } from "./errores.js";
import { usuarioPublico } from "./autenticar.js";
import { passwordSchema } from "./gestionarUsuarios.js";

const registroSchema = z.strictObject({
  nombre: z.string({ error: "El nombre es obligatorio" }).trim().min(2, "El nombre es muy corto").max(120),
  correo: z.string({ error: "El correo es obligatorio" }).trim().toLowerCase().min(1, "El correo es obligatorio").email("Correo inválido"),
  password: passwordSchema,
  tipo: z.enum(TIPOS_REPORTANTE, { error: "Indica si eres docente, estudiante o administrativo" }),
});

/**
 * @param {{usuariosRepo: object, hasher: {hashear: Function}, auditor: {registroPublico: Function}, abierto?: boolean, reloj?: () => Date}} deps
 */
export function registrarUsuario({ usuariosRepo, hasher, auditor, abierto = true, reloj = () => new Date() }) {
  return async function registrar(entrada, ip) {
    if (!abierto) throw new ErrorApp("SIN_PERMISO", "El registro público está desactivado");
    const d = registroSchema.parse(entrada ?? {});
    let creado;
    try {
      creado = await usuariosRepo.insertar({
        nombre: d.nombre,
        correo: d.correo,
        password_hash: await hasher.hashear(d.password),
        rol: "reportante",
        tipo: d.tipo,
        activo: true,
        fecha_creacion: reloj(),
      });
    } catch (e) {
      if (e?.codigo === "CORREO_DUPLICADO") throw new ErrorApp("CONFLICTO", "Ese correo ya está registrado");
      throw e;
    }
    const usuario = usuarioPublico(creado);
    await auditor.registroPublico({ usuario, ip });
    return { usuario };
  };
}
