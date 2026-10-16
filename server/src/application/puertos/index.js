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

/**
 * Puerto del contador de incidencias (atómico; el adaptador usa `$inc` en MongoDB).
 * @typedef {Object} Contador
 * @property {(categoria: string, fecha: Date) => Promise<number>} siguienteDiario  Consecutivo del día (zona America/Merida) por categoría, desde 1.
 * @property {(anio: number) => Promise<number>} siguienteAnual                     Consecutivo anual para el código INC-AAAA-NNNN, desde 1.
 */

/**
 * Puerto de escritura de incidencias.
 * @typedef {Object} IncidenciasRepo
 * @property {(doc: object) => Promise<object>} insertar  Inserta el documento y lo devuelve con `_id`.
 * @property {(codigo: string) => Promise<object|null>} buscarPorCodigo  Expediente completo o null.
 * @property {(datos: {q: string, propietarioId?: string, limite: number}) => Promise<object[]>} buscarTexto
 *   Búsqueda `$text` (idx_texto_es) ordenada por relevancia; cada documento trae `score`. Sin bitácora, evidencias ni detalle.
 * @property {(datos: {codigo: string, estadoLeido: string, cambios: {$set: object, $push: object, $inc: object}}) => Promise<boolean>} actualizarEstado
 *   UN solo updateOne con filtro { codigo, estado: estadoLeido }. true si se aplicó; false si otra persona cambió el estado antes (conflicto).
 * @property {(datos: {codigo: string, cambios: {$set: object}}) => Promise<boolean>} editar
 *   UN solo updateOne con filtro { codigo } (RF-12). true si la incidencia existe; false si no.
 * @property {(codigo: string) => Promise<boolean>} eliminar  deleteOne por código. true si borró un documento.
 */

/**
 * Puerto del almacén de archivos (bucket de evidencias).
 * @typedef {Object} Almacen
 * @property {(paths: string[]) => Promise<void>} eliminarArchivos  Borra por `storage_path`; lanza si falla.
 */

export {};
