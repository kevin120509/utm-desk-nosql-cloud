// Escapa el texto del usuario para usarlo dentro de una expresión regular de MongoDB.
// Sin esto, un "." o un "(" en la búsqueda se interpretaría como regex (y podría romper la consulta).
export function regexSeguro(texto) {
  const escapado = String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escapado, "i");
}
