// Validador $jsonSchema de la colección incidencias_campus (plan §4.3).
// Las reglas "solo si" (contratista_externo, codigo_curso) las valida Zod: Mongo no tiene if/then.
import { CATEGORIAS, PRIORIDADES, ESTADOS, TIPOS_REPORTANTE } from "../../domain/enumeraciones.js";

const NUMERO = ["int", "double"];
const ENTERO = ["int", "long", "double"]; // el driver de JS guarda doubles aunque el valor sea entero

const cadena = (extra = {}) => ({ bsonType: "string", minLength: 1, ...extra });

const reportante = {
  bsonType: "object",
  required: ["usuario_id", "nombre", "tipo", "correo"],
  additionalProperties: false,
  properties: {
    usuario_id: { bsonType: "objectId" },
    nombre: cadena({ maxLength: 120 }),
    tipo: { enum: TIPOS_REPORTANTE },
    correo: cadena({ maxLength: 200 }),
  },
};

const asignadoA = {
  bsonType: "object",
  required: ["usuario_id", "nombre"],
  additionalProperties: false,
  properties: {
    usuario_id: { bsonType: "objectId" },
    nombre: cadena({ maxLength: 120 }),
  },
};

const ubicacion = {
  bsonType: "object",
  required: ["edificio", "espacio"],
  additionalProperties: false,
  properties: {
    edificio: cadena({ maxLength: 120 }),
    piso: { bsonType: NUMERO },
    espacio: cadena({ maxLength: 120 }),
  },
};

const entradaHistorial = {
  bsonType: "object",
  required: ["fecha", "autor", "estado_nuevo", "comentario", "horas"],
  additionalProperties: false,
  properties: {
    fecha: { bsonType: "date" },
    autor: asignadoA,
    estado_anterior: { enum: ESTADOS },
    estado_nuevo: { enum: ESTADOS },
    comentario: { bsonType: "string", maxLength: 1000 },
    horas: { bsonType: NUMERO, minimum: 0 },
  },
};

const evidencia = {
  bsonType: "object",
  required: ["nombre_archivo", "tipo_mime", "peso_kb", "storage_path", "url_storage", "url_expira", "fecha_carga"],
  additionalProperties: false,
  properties: {
    nombre_archivo: cadena({ maxLength: 255 }),
    tipo_mime: cadena({ maxLength: 100 }),
    peso_kb: { bsonType: NUMERO, minimum: 0 },
    storage_path: cadena(),
    url_storage: cadena(),
    url_expira: { bsonType: "date" },
    fecha_carga: { bsonType: "date" },
  },
};

// IPv4: cuatro octetos 0-255.
const OCTETO = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = `^${OCTETO}(\\.${OCTETO}){3}$`;

const detalleComputoRedes = {
  bsonType: "object",
  required: ["tipo_falla", "direccion_ip", "vlan", "puerto_uplink", "equipos_afectados"],
  additionalProperties: false,
  properties: {
    tipo_falla: { enum: ["switch", "access_point", "servidor", "equipo_laboratorio"] },
    direccion_ip: { bsonType: "string", pattern: IPV4 },
    vlan: { bsonType: ENTERO, minimum: 1, maximum: 4094 },
    puerto_uplink: cadena({ maxLength: 60 }),
    equipos_afectados: { bsonType: ENTERO, minimum: 1 },
  },
};

const detalleInfraestructura = {
  bsonType: "object",
  required: ["tipo_dano", "riesgo_seguridad", "requiere_contratista"],
  additionalProperties: false,
  properties: {
    tipo_dano: { enum: ["filtracion", "luminaria", "climatizacion", "cerradura", "otro"] },
    riesgo_seguridad: { enum: ["ninguno", "bajo", "medio", "alto"] },
    requiere_contratista: { bsonType: "bool" },
    insumos_requeridos: { bsonType: "array", minItems: 1, items: cadena({ maxLength: 120 }) },
    contratista_externo: cadena({ maxLength: 120 }),
  },
};

const detalleAcademico = {
  bsonType: "object",
  required: ["plataforma", "periodo_escolar", "estudiantes_impactados"],
  additionalProperties: false,
  properties: {
    plataforma: { enum: ["lms", "portal_calificaciones", "correo_institucional"] },
    periodo_escolar: { bsonType: "string", pattern: "^\\d{4}-[1-3]$" },
    estudiantes_impactados: { bsonType: ENTERO, minimum: 1 },
    codigo_curso: cadena({ maxLength: 40 }),
  },
};

export const validadorIncidencias = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "codigo", "consecutivo_diario", "titulo", "descripcion", "categoria", "prioridad", "estado",
      "reportante", "ubicacion", "detalle_especifico", "tags", "historial_seguimiento",
      "evidencias_adjuntas", "horas_invertidas", "fecha_creacion", "fecha_actualizacion",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      codigo: { bsonType: "string", pattern: "^INC-\\d{4}-\\d{4,}$" },
      consecutivo_diario: { bsonType: ENTERO, minimum: 1 },
      titulo: { bsonType: "string", minLength: 5, maxLength: 120 },
      descripcion: { bsonType: "string", minLength: 10, maxLength: 2000 },
      categoria: { enum: CATEGORIAS },
      prioridad: { enum: PRIORIDADES },
      estado: { enum: ESTADOS },
      reportante,
      asignado_a: asignadoA,
      ubicacion,
      detalle_especifico: { bsonType: "object" },
      tags: { bsonType: "array", uniqueItems: true, items: { bsonType: "string", minLength: 2, maxLength: 40 } },
      historial_seguimiento: { bsonType: "array", minItems: 1, items: entradaHistorial },
      evidencias_adjuntas: { bsonType: "array", items: evidencia },
      horas_invertidas: { bsonType: NUMERO, minimum: 0 },
      fecha_creacion: { bsonType: "date" },
      fecha_actualizacion: { bsonType: "date" },
      fecha_resolucion: { bsonType: "date" },
    },
    allOf: [
      {
        // Polimorfismo: cada categoría exige SU forma de detalle_especifico.
        oneOf: [
          { properties: { categoria: { enum: ["computo_redes"] }, detalle_especifico: detalleComputoRedes } },
          { properties: { categoria: { enum: ["infraestructura"] }, detalle_especifico: detalleInfraestructura } },
          { properties: { categoria: { enum: ["academico"] }, detalle_especifico: detalleAcademico } },
        ],
      },
      {
        // fecha_resolucion obligatoria solo en resuelta/cerrada.
        anyOf: [
          { properties: { estado: { enum: ["abierta", "en proceso", "en espera"] } } },
          { required: ["fecha_resolucion"], properties: { estado: { enum: ["resuelta", "cerrada"] } } },
        ],
      },
    ],
  },
};
