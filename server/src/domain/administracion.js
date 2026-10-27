// Esquemas propios del módulo admin que Kevin no cubre: vista de incidencias del superAdmin.
// Permisos, usuarios, roles, catálogos, bitácora y salud viven en permisos.js y en los casos
// de uso de administrar.js / gestionarUsuarios.js (versión de origin/main).
import { z } from 'zod';
import { consultaListaSchema } from './consulta.js';

// Incidencias en el módulo admin: la misma lista de RF-06 más búsqueda por texto libre
// (código, título o descripción).
export const adminIncidenciasQuerySchema = consultaListaSchema.extend({
  q: z.string({ error: 'La búsqueda debe ser texto' }).trim().min(1, 'La búsqueda no puede estar vacía').max(100, 'La búsqueda admite máximo 100 caracteres').optional(),
});
