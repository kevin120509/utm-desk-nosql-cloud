// Esquemas de validación (Zod). Todos son .strict(): un campo extra es error.
// Los campos opcionales NO se rellenan con null: simplemente no existen.
import { z } from 'zod';
import { CATEGORIAS, PRIORIDADES, ESTADOS } from './enumeraciones.js';

// ---------- Piezas reutilizables ----------

const textoNoVacio = (campo) =>
  z.string({ error: `${campo} debe ser texto` }).trim().min(1, `${campo} no puede estar vacío`);

const enteroMin = (campo, min) =>
  z.number({ error: `${campo} debe ser un número` }).int(`${campo} debe ser entero`).min(min, `${campo} debe ser al menos ${min}`);

// IPv4: cuatro octetos 0-255 separados por punto (sin ceros a la izquierda raros).
const ipv4 = z.string({ error: 'direccion_ip debe ser texto' }).refine(
  (v) => {
    const partes = v.split('.');
    return partes.length === 4 && partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
  },
  { message: 'direccion_ip no es una IPv4 válida (ej. 10.20.2.1)' },
);

const enumDe = (valores, campo) =>
  z.enum(valores, { error: `${campo} debe ser uno de: ${valores.join(', ')}` });

// ---------- detalle_especifico por categoría ----------

export const detalleComputoRedes = z
  .object({
    tipo_falla: enumDe(['switch', 'access_point', 'servidor', 'equipo_laboratorio'], 'tipo_falla'),
    direccion_ip: ipv4,
    vlan: enteroMin('vlan', 1).max(4094, 'vlan debe ser como máximo 4094'),
    puerto_uplink: textoNoVacio('puerto_uplink'),
    equipos_afectados: enteroMin('equipos_afectados', 1),
  })
  .strict();

export const detalleInfraestructura = z
  .object({
    tipo_dano: enumDe(['filtracion', 'luminaria', 'climatizacion', 'cerradura', 'otro'], 'tipo_dano'),
    riesgo_seguridad: enumDe(['ninguno', 'bajo', 'medio', 'alto'], 'riesgo_seguridad'),
    requiere_contratista: z.boolean({ error: 'requiere_contratista debe ser verdadero o falso' }),
    insumos_requeridos: z
      .array(textoNoVacio('insumo'), { error: 'insumos_requeridos debe ser una lista de textos' })
      .min(1, 'insumos_requeridos necesita al menos un elemento')
      .optional(),
    contratista_externo: textoNoVacio('contratista_externo').optional(),
  })
  .strict()
  .refine((d) => d.contratista_externo === undefined || d.requiere_contratista === true, {
    message: 'contratista_externo solo se permite si requiere_contratista es true',
    path: ['contratista_externo'],
  });

export const detalleAcademico = z
  .object({
    plataforma: enumDe(['lms', 'portal_calificaciones', 'correo_institucional'], 'plataforma'),
    periodo_escolar: z
      .string({ error: 'periodo_escolar debe ser texto' })
      .regex(/^\d{4}-[1-3]$/, 'periodo_escolar debe tener formato AAAA-1, AAAA-2 o AAAA-3'),
    estudiantes_impactados: enteroMin('estudiantes_impactados', 1),
    codigo_curso: textoNoVacio('codigo_curso').optional(),
  })
  .strict()
  .refine((d) => d.codigo_curso === undefined || d.plataforma !== 'correo_institucional', {
    message: 'codigo_curso solo aplica para lms o portal_calificaciones',
    path: ['codigo_curso'],
  });

// ---------- Piezas de la incidencia ----------

const titulo = z
  .string({ error: 'titulo debe ser texto' })
  .trim()
  .min(5, 'titulo debe tener al menos 5 caracteres')
  .max(120, 'titulo debe tener máximo 120 caracteres');

const descripcion = z
  .string({ error: 'descripcion debe ser texto' })
  .trim()
  .min(10, 'descripcion debe tener al menos 10 caracteres')
  .max(2000, 'descripcion debe tener máximo 2000 caracteres');

const prioridad = enumDe(PRIORIDADES, 'prioridad');

const ubicacion = z
  .object({
    edificio: textoNoVacio('edificio'),
    piso: z.number({ error: 'piso debe ser un número' }).int('piso debe ser entero').optional(),
    espacio: textoNoVacio('espacio'),
  })
  .strict();

// Campos comunes de la incidencia (sin categoría ni detalle).
const comunes = { titulo, descripcion, prioridad, ubicacion };

// Cuerpo de POST /api/incidencias. El detalle se valida según `categoria`
// (unión discriminada): un detalle de otra categoría falla.
// El reportante NO va aquí: sale de la sesión.
export const crearIncidenciaSchema = z.discriminatedUnion(
  'categoria',
  [
    z.object({ ...comunes, categoria: z.literal('computo_redes'), detalle_especifico: detalleComputoRedes }).strict(),
    z.object({ ...comunes, categoria: z.literal('infraestructura'), detalle_especifico: detalleInfraestructura }).strict(),
    z.object({ ...comunes, categoria: z.literal('academico'), detalle_especifico: detalleAcademico }).strict(),
  ],
  { error: `categoria debe ser una de: ${CATEGORIAS.join(', ')}` },
);

// Cuerpo de PATCH /api/incidencias/:codigo/estado
export const cambiarEstadoSchema = z
  .object({
    estado_nuevo: enumDe(ESTADOS, 'estado_nuevo'),
    horas: z
      .number({ error: 'horas debe ser un número' }) // rechaza NaN
      .min(0, 'horas no puede ser negativo')
      .max(24, 'horas debe ser como máximo 24'),
    comentario: z
      .string({ error: 'comentario debe ser texto' })
      .trim()
      .min(3, 'comentario debe tener al menos 3 caracteres')
      .max(500, 'comentario debe tener máximo 500 caracteres'),
  })
  .strict();

// Etiqueta: se normaliza (sin espacios en los extremos y en minúsculas) y luego se valida.
export const etiquetaSchema = z
  .string({ error: 'la etiqueta debe ser texto' })
  .trim()
  .toLowerCase()
  .min(2, 'la etiqueta debe tener al menos 2 caracteres')
  .max(40, 'la etiqueta debe tener máximo 40 caracteres');

// Cuerpo de PATCH /api/incidencias/:codigo (solo coordinador). Todos opcionales, al menos uno.
export const editarIncidenciaSchema = z
  .object({
    titulo: titulo.optional(),
    descripcion: descripcion.optional(),
    prioridad: prioridad.optional(),
    ubicacion: ubicacion.optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debes enviar al menos un campo a editar' });
