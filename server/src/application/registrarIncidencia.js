// Caso de uso: alta de incidencia (RF-01/02/03, CU-01).
import { crearIncidenciaSchema, generarCodigo } from "../domain/index.js";
import { ErrorApp } from "./errores.js";

const ZONA_HORARIA = "America/Merida";

// Año calendario en la zona del campus (no en UTC del servidor).
function anioEnMerida(fecha) {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric" }).format(fecha));
}

/**
 * @param {{incidenciasRepo: import("./puertos/index.js").IncidenciasRepo,
 *          contador: import("./puertos/index.js").Contador,
 *          usuariosRepo: import("./puertos/index.js").UsuariosRepo,
 *          reloj?: () => Date}} deps
 * @returns {(sesion: {id: string}, entrada: unknown) => Promise<object>}
 */
export function registrarIncidencia({ incidenciasRepo, contador, usuariosRepo, catalogos, reloj = () => new Date() }) {
  return async function registrar(sesion, entrada) {
    // 1. Zod lanza ZodError si algo está mal (la capa HTTP lo vuelve 400 VALIDACION).
    const datos = crearIncidenciaSchema.parse(entrada ?? {});

    // 1b. Categoría y ubicación contra el catálogo que administra el superAdmin (si ya existe).
    await catalogos?.validarUbicacion(datos);

    // 2. El reportante sale SIEMPRE de la sesión, nunca del cuerpo.
    const usuario = await usuariosRepo.buscarPorId(sesion.id);
    if (!usuario || usuario.activo === false) {
      throw new ErrorApp("NO_AUTENTICADO", "Sesión inválida o expirada");
    }

    // 3. Consecutivos atómicos y código público.
    const ahora = reloj();
    const consecutivo_diario = await contador.siguienteDiario(datos.categoria, ahora);
    const anio = anioEnMerida(ahora);
    const codigo = generarCodigo(anio, await contador.siguienteAnual(anio));

    // Decisión: `tipo` (docente|estudiante|administrativo) solo existe en reportantes.
    // El $jsonSchema lo exige en `reportante`; el personal (técnico/coordinador) no
    // tiene tipo, así que se registra como "administrativo" (es personal de la UTM).
    const tipo = usuario.tipo ?? "administrativo";

    // 4. Documento exacto del plan §4.1: sin asignado_a, sin fecha_resolucion, sin null.
    const doc = {
      codigo,
      consecutivo_diario,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      categoria: datos.categoria,
      prioridad: datos.prioridad,
      estado: "abierta",
      reportante: { usuario_id: usuario._id, nombre: usuario.nombre, tipo, correo: usuario.correo },
      ubicacion: datos.ubicacion,
      detalle_especifico: datos.detalle_especifico,
      tags: [],
      historial_seguimiento: [
        {
          fecha: ahora,
          autor: { usuario_id: usuario._id, nombre: usuario.nombre },
          estado_nuevo: "abierta",
          comentario: "Incidencia registrada",
          horas: 0,
        },
      ],
      evidencias_adjuntas: [],
      horas_invertidas: 0,
      fecha_creacion: ahora,
      fecha_actualizacion: ahora,
    };

    return incidenciasRepo.insertar(doc);
  };
}
