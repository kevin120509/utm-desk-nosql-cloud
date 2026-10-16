// Puertos (contratos) que los casos de uso necesitan. Solo documentación JSDoc:
// la infraestructura (Mongo, bcrypt, JWT) los implementa y se inyectan desde fuera.

/**
 * Datos de un usuario tal como viven en la colección `usuarios`.
 * @typedef {Object} UsuarioDoc
 * @property {*} _id            Identificador (ObjectId en Mongo).
 * @property {string} nombre
 * @property {string} correo
 * @property {string} password_hash
 * @property {"reportante"|"tecnico"|"coordinador"|"directivo"} rol
 * @property {"docente"|"estudiante"|"administrativo"} [tipo]  Solo reportantes.
 * @property {boolean} activo
 */

/**
 * Puerto de lectura de usuarios.
 * @typedef {Object} UsuariosRepo
 * @property {(correo: string) => Promise<UsuarioDoc|null>} buscarPorCorreo  Correo ya normalizado.
 * @property {(id: string) => Promise<UsuarioDoc|null>} buscarPorId          null si no existe o el id es inválido.
 */

/**
 * Puerto para comparar contraseñas contra su hash.
 * @typedef {Object} Hasher
 * @property {(plano: string, hash: string) => Promise<boolean>} comparar
 */

/**
 * Puerto para emitir y validar tokens de sesión.
 * @typedef {Object} Tokens
 * @property {(payload: {sub: string, rol: string, nombre: string}) => string} firmar
 * @property {(token: string) => {sub: string, rol: string, nombre: string}} verificar  Lanza si es inválido o expiró.
 */

export {};
