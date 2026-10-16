// Validación de los parámetros de consulta de la lista (RF-06) y del código público.
import { z } from 'zod';
import { CATEGORIAS, PRIORIDADES, ESTADOS } from './enumeraciones.js';

// Los parámetros llegan como texto (?pagina=2), por eso se usa coerce en los números.
// strictObject: un parámetro desconocido (?foo=1) es un error 400, no se ignora.
export const consultaListaSchema = z.strictObject({
  categoria: z.enum(CATEGORIAS, { error: 'Categoría no válida' }).optional(),
  estado: z.enum(ESTADOS, { error: 'Estado no válido' }).optional(),
  prioridad: z.enum(PRIORIDADES, { error: 'Prioridad no válida' }).optional(),
  edificio: z.string({ error: 'Edificio no válido' }).trim().min(1, 'Edificio vacío').max(60, 'Edificio demasiado largo').optional(),
  pagina: z.coerce.number({ error: 'La página debe ser un número' }).int('La página debe ser un entero').min(1, 'La página mínima es 1').default(1),
  limite: z.coerce.number({ error: 'El límite debe ser un número' }).int('El límite debe ser un entero').min(1, 'El límite mínimo es 1').max(50, 'El límite máximo es 50').default(10),
});

// Forma del código público: INC-AAAA-NNNN (ver codigo.js).
export const PATRON_CODIGO = /^INC-\d{4}-\d{4,}$/;
