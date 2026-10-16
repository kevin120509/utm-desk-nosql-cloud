// Genera el código público de una incidencia: INC-AAAA-NNNN.

const esEnteroPositivo = (n) => Number.isInteger(n) && n > 0;

/**
 * @param {number} anio              año con 4 dígitos (ej. 2026)
 * @param {number} consecutivoAnual  número de incidencia en el año (1, 2, 3...)
 * El consecutivo se rellena a 4 dígitos; si pasa de 9999 simplemente crece (no se trunca).
 */
export function generarCodigo(anio, consecutivoAnual) {
  if (!esEnteroPositivo(anio)) throw new Error('El año debe ser un entero positivo');
  if (!esEnteroPositivo(consecutivoAnual)) throw new Error('El consecutivo debe ser un entero positivo');
  return `INC-${anio}-${String(consecutivoAnual).padStart(4, '0')}`;
}
