// Error de aplicación con código estable. La capa HTTP lo traduce a un status.
// No depende de Express: los casos de uso solo lanzan ErrorApp.
export class ErrorApp extends Error {
  /**
   * @param {string} codigo   Código estable (p. ej. "CREDENCIALES_INVALIDAS").
   * @param {string} mensaje  Texto seguro para mostrar al usuario.
   */
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = "ErrorApp";
    this.codigo = codigo;
  }
}
