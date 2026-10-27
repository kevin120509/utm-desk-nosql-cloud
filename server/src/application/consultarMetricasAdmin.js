// Caso de uso: métricas del módulo admin, calculadas en MongoDB (solo lectura).
/**
 * @param {{metricasRepo: {obtener: () => Promise<object>}, ahora?: () => Date}} deps
 */
export function consultarMetricasAdmin({ metricasRepo, ahora = () => new Date() }) {
  return async function metricas() {
    return { ...(await metricasRepo.obtener()), generado_en: ahora() };
  };
}
