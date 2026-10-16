// Caso de uso: gestionar etiquetas técnicas dinámicas (RF-08, CU-04).
import { z } from "zod";
import { etiquetaSchema, PATRON_CODIGO } from "../domain/index.js";
import { ErrorApp } from "./errores.js";

// Cuerpo del POST: solo { tag }. Campos extra son un error 400.
const cuerpoAgregarSchema = z.strictObject({ tag: etiquetaSchema });

function exigirCodigoValido(codigo) {
  // Un código con mala forma no puede existir: 404 sin tocar la BD.
  if (!PATRON_CODIGO.test(String(codigo))) {
    throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
  }
}

/**
 * @param {{etiquetasRepo: {agregar: Function, quitar: Function}, reloj?: () => Date}} deps
 * @returns {{agregar: Function, quitar: Function}}
 */
export function gestionarEtiquetas({ etiquetasRepo, reloj = () => new Date() }) {
  return {
    /** POST /:codigo/tags -> { tags } */
    async agregar(_sesion, codigo, entrada) {
      exigirCodigoValido(codigo);
      // Normaliza ("Switch " y "switch" son la misma etiqueta) y valida con Zod.
      const { tag } = cuerpoAgregarSchema.parse(entrada ?? {});
      const tags = await etiquetasRepo.agregar(codigo, tag, reloj());
      if (!tags) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
      return { tags };
    },

    /** DELETE /:codigo/tags/:tag -> { tags } (idempotente: quitar algo que no está no falla) */
    async quitar(_sesion, codigo, tagCrudo) {
      exigirCodigoValido(codigo);
      const tag = etiquetaSchema.parse(tagCrudo);
      const tags = await etiquetasRepo.quitar(codigo, tag, reloj());
      if (!tags) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");
      return { tags };
    },
  };
}
