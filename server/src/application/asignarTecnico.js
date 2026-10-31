// Caso de uso: el coordinador asigna o reasigna un técnico a una incidencia.
import { z } from "zod";
import { ErrorApp } from "./errores.js";
import { PATRON_CODIGO } from "../domain/index.js";

const entradaSchema = z.strictObject({
  tecnico_id: z.string().trim().min(1, "tecnico_id es obligatorio"),
  comentario: z.string().trim().min(3).max(500).optional(),
});

export function asignarTecnico({ incidenciasRepo, usuariosRepo, reloj = () => new Date() }) {
  return async function asignar(sesion, codigo, entrada) {
    const datos = entradaSchema.parse(entrada ?? {});
    if (!PATRON_CODIGO.test(String(codigo))) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");

    const incidencia = await incidenciasRepo.buscarPorCodigo(codigo);
    if (!incidencia) throw new ErrorApp("NO_ENCONTRADO", "La incidencia no existe");

    const tecnico = await usuariosRepo.buscarPorId(datos.tecnico_id);
    if (!tecnico || tecnico.activo === false || tecnico.rol !== "tecnico") {
      throw new ErrorApp("TECNICO_INVALIDO", "El usuario seleccionado no es un técnico activo");
    }
    if (tecnico.disponible === false) {
      throw new ErrorApp("TECNICO_NO_DISPONIBLE", "El técnico seleccionado no está disponible");
    }
    if (Array.isArray(tecnico.categorias_atiende) && tecnico.categorias_atiende.length > 0 && !tecnico.categorias_atiende.includes(incidencia.categoria)) {
      throw new ErrorApp("TECNICO_NO_ATIENDE_CATEGORIA", "El técnico no atiende la categoría de esta incidencia");
    }

    const autor = await usuariosRepo.buscarPorId(sesion.id);
    if (!autor || autor.activo === false) throw new ErrorApp("NO_AUTENTICADO", "Sesión inválida o expirada");

    const ahora = reloj();
    const asignado = { usuario_id: tecnico._id, nombre: tecnico.nombre };
    const movimiento = {
      fecha: ahora,
      autor: { usuario_id: autor._id, nombre: autor.nombre },
      tipo: "asignacion",
      estado_nuevo: incidencia.estado,
      comentario: datos.comentario || `Incidencia asignada a ${tecnico.nombre}`,
      horas: 0,
      tecnico_nuevo: tecnico._id,
    };
    if (incidencia.asignado_a?.usuario_id) movimiento.tecnico_anterior = incidencia.asignado_a.usuario_id;

    const aplicado = await incidenciasRepo.asignarTecnico({ codigo, asignado, movimiento, ahora });
    if (!aplicado) throw new ErrorApp("CONFLICTO", "La incidencia fue modificada por otra persona; recarga e intenta de nuevo");
    return incidenciasRepo.buscarPorCodigo(codigo);
  };
}

export function listarTecnicosDisponibles({ usuariosRepo }) {
  return async function listar(categoria) {
    const datos = await usuariosRepo.listarTecnicosDisponibles(categoria);
    return datos.map((u) => ({
      id: String(u._id),
      nombre: u.nombre,
      correo: u.correo,
      categorias: u.categorias_atiende ?? [],
    }));
  };
}
