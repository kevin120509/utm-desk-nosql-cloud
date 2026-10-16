// Caso de uso: analítica para coordinador y directivo (RF-10, CU-06).
// El permiso por rol lo aplica la ruta; aquí solo se consulta y se da forma.

/**
 * @param {{analiticaRepo: {eficienciaPorEdificio: Function, topTags: Function}}} deps
 * @returns {{edificios: Function, tags: Function}}
 */
export function consultarAnalitica({ analiticaRepo }) {
  return {
    /** GET /edificios -> { datos } (arreglo vacío si aún no hay incidencias resueltas) */
    async edificios(_sesion) {
      return { datos: (await analiticaRepo.eficienciaPorEdificio()) ?? [] };
    },

    /** GET /tags -> { datos } (arreglo vacío si ninguna incidencia tiene etiquetas) */
    async tags(_sesion) {
      return { datos: (await analiticaRepo.topTags()) ?? [] };
    },
  };
}
