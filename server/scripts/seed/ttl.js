// Documentos de la demostración del TTL (CU-07, RF-11). Módulo PURO.
// El índice `idx_ttl_resolucion` borra un documento cuando `fecha_resolucion` + 60 días ya pasó:
//   - uno resuelto hace 61 días: debe desaparecer solo (en el siguiente barrido, ~1 minuto);
//   - uno resuelto hace 59 días: debe permanecer.
import { generarCodigo } from "../../src/domain/index.js";
import { ObjectId } from "mongodb";

const MS_DIA = 24 * 3_600_000;
const MS_HORA = 3_600_000;

export const DIAS_VIEJO = 61;
export const DIAS_RECIENTE = 59;
// Consecutivos altos y reservados: no chocan con los del seed ni con las altas reales.
const CONSECUTIVO_VIEJO = 9061;
const CONSECUTIVO_RECIENTE = 9059;

function documento({ ahora, diasDesdeResolucion, consecutivo, titulo }) {
  const resolucion = new Date(ahora.getTime() - diasDesdeResolucion * MS_DIA);
  const creacion = new Date(resolucion.getTime() - 3 * MS_HORA);
  const anio = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Merida", year: "numeric" }).format(ahora));
  const autor = { usuario_id: new ObjectId(), nombre: "Demo TTL" };
  return {
    codigo: generarCodigo(anio, consecutivo),
    consecutivo_diario: 1,
    titulo,
    descripcion: "Documento temporal para demostrar la depuración automática por TTL.",
    categoria: "infraestructura_fisica",
    prioridad: "baja",
    estado: "resuelta",
    reportante: { usuario_id: autor.usuario_id, nombre: autor.nombre, tipo: "administrativo", correo: "demo.ttl@utmetropolitana.edu.mx" },
    ubicacion: { edificio: "Administrativo", espacio: "Demo TTL" },
    detalle_especifico: { tipo_dano: "otro", riesgo_seguridad: "ninguno", requiere_contratista: false },
    tags: ["demo-ttl"],
    historial_seguimiento: [
      { fecha: creacion, autor, estado_nuevo: "abierta", comentario: "Incidencia registrada", horas: 0 },
      { fecha: resolucion, autor, estado_anterior: "abierta", estado_nuevo: "resuelta", comentario: "Resuelta para la demostración", horas: 1 },
    ],
    evidencias_adjuntas: [],
    horas_invertidas: 1,
    fecha_creacion: creacion,
    fecha_actualizacion: resolucion,
    fecha_resolucion: resolucion,
  };
}

/**
 * @param {Date} ahora
 * @returns {{viejo: object, reciente: object}}
 */
export function construirDocumentosTtl(ahora) {
  const hacer = (args) => documento({ ahora, ...args });
  return {
    viejo: hacer({
      diasDesdeResolucion: DIAS_VIEJO,
      consecutivo: CONSECUTIVO_VIEJO,
      titulo: "[DEMO TTL] Incidencia resuelta hace 61 días (debe depurarse sola)",
    }),
    reciente: hacer({
      diasDesdeResolucion: DIAS_RECIENTE,
      consecutivo: CONSECUTIVO_RECIENTE,
      titulo: "[DEMO TTL] Incidencia resuelta hace 59 días (debe permanecer)",
    }),
  };
}
