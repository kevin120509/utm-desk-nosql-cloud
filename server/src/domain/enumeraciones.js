// Listas de valores permitidos. Son la única fuente de verdad:
// los esquemas Zod, las transiciones y el $jsonSchema de Mongo deben usar estos mismos valores.

export const CATEGORIAS = ['computo_redes', 'infraestructura', 'academico'];

// 4 prioridades (el enunciado dice "3", pero el plan decidió 4).
export const PRIORIDADES = ['baja', 'media', 'alta', 'critica'];

export const ESTADOS = ['abierta', 'en proceso', 'en espera', 'resuelta', 'cerrada'];

export const ROLES = ['reportante', 'tecnico', 'coordinador', 'directivo'];

// Tipo de persona que reporta (solo aplica a usuarios con rol reportante).
export const TIPOS_REPORTANTE = ['docente', 'estudiante', 'administrativo'];
