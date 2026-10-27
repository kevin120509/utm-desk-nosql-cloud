// Módulo administrativo (superAdmin): permisos, esquemas de entrada y reglas de dominio.
// Solo `superAdmin` tiene permisos administrativos; el resto de roles no tiene ninguno aquí.
import { z } from 'zod';
import { ROLES, TIPOS_REPORTANTE } from './enumeraciones.js';
import { consultaListaSchema } from './consulta.js';

// Permisos del módulo /api/admin. El nombre es parte del contrato (los tests lo usan).
export const PERMISOS = [
  'usuarios:leer',
  'usuarios:gestionar',
  'roles:leer',
  'catalogos:leer',
  'incidencias:leer',
  'bitacora:leer',
  'metricas:leer',
  'sistema:leer',
];

// Permisos por rol. Los roles no administrativos no aparecen: no tienen acceso a /api/admin.
const ROL_PERMISOS = {
  superAdmin: PERMISOS,
};

/** Permisos concedidos a un rol (lista vacía si el rol no es administrativo). */
export function permisosDeRol(rol) {
  return ROL_PERMISOS[rol] ?? [];
}

// ---------- Esquemas de entrada ----------

// `activo` llega como texto en la query: "true" | "false". Sin filtro = todos.
const booleanoQuery = z.enum(['true', 'false'], { error: 'Debe ser true o false' }).transform((v) => v === 'true');

export const adminUsuariosQuerySchema = z
  .strictObject({
    q: z.string({ error: 'La búsqueda debe ser texto' }).trim().min(1, 'La búsqueda no puede estar vacía').max(100, 'La búsqueda admite máximo 100 caracteres').optional(),
    rol: z.enum(ROLES, { error: 'Rol no válido' }).optional(),
    activo: booleanoQuery.optional(),
    pagina: z.coerce.number({ error: 'La página debe ser un número' }).int('La página debe ser un entero').min(1, 'La página mínima es 1').default(1),
    limite: z.coerce.number({ error: 'El límite debe ser un número' }).int('El límite debe ser un entero').min(1, 'El límite mínimo es 1').max(50, 'El límite máximo es 50').default(10),
  });

// PATCH /api/admin/usuarios/:id/estado
export const cambiarEstadoUsuarioSchema = z
  .strictObject({
    activo: z.boolean({ error: 'activo debe ser verdadero o falso' }),
  });

// PATCH /api/admin/usuarios/:id/roles. Un usuario tiene UN rol (campo `rol`).
// `tipo` solo aplica a reportantes y es obligatorio para ellos.
export const cambiarRolUsuarioSchema = z
  .strictObject({
    rol: z.enum(ROLES, { error: `rol debe ser uno de: ${ROLES.join(', ')}` }),
    tipo: z.enum(TIPOS_REPORTANTE, { error: `tipo debe ser uno de: ${TIPOS_REPORTANTE.join(', ')}` }).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.rol === 'reportante' && !d.tipo) {
      ctx.addIssue({ code: 'custom', path: ['tipo'], message: 'tipo es obligatorio para el rol reportante' });
    }
    if (d.rol !== 'reportante' && d.tipo !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['tipo'], message: 'tipo solo aplica al rol reportante' });
    }
  });

// Incidencias en el módulo admin: la misma lista de RF-06 más búsqueda por texto libre
// (código, título o descripción).
export const adminIncidenciasQuerySchema = consultaListaSchema.extend({
  q: z.string({ error: 'La búsqueda debe ser texto' }).trim().min(1, 'La búsqueda no puede estar vacía').max(100, 'La búsqueda admite máximo 100 caracteres').optional(),
});

export const adminBitacoraQuerySchema = z.strictObject({
  modulo: z.string({ error: 'modulo debe ser texto' }).trim().min(1).max(40).optional(),
  resultado: z.enum(['exito', 'rechazado'], { error: 'resultado debe ser exito o rechazado' }).optional(),
  pagina: z.coerce.number({ error: 'La página debe ser un número' }).int('La página debe ser un entero').min(1, 'La página mínima es 1').default(1),
  limite: z.coerce.number({ error: 'El límite debe ser un número' }).int('El límite debe ser un entero').min(1, 'El límite mínimo es 1').max(50, 'El límite máximo es 50').default(10),
});

// Forma de un id de usuario (ObjectId: 24 caracteres hexadecimales).
export const PATRON_ID_USUARIO = /^[a-f\d]{24}$/i;
