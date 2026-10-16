// Caso de uso: autenticación (login y resolución de usuario desde token).
// Recibe sus dependencias (puertos) por parámetro: no conoce Express ni Mongo.
import { ErrorApp } from "./errores.js";

// Mismo mensaje para todo fallo de login: no revela si el correo existe.
const credencialesInvalidas = () =>
  new ErrorApp("CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos");

const noAutenticado = () => new ErrorApp("NO_AUTENTICADO", "Sesión inválida o expirada");

// Vista pública del usuario: nunca incluye password_hash; `tipo` solo si existe.
function usuarioPublico(doc) {
  const usuario = {
    id: String(doc._id),
    nombre: doc.nombre,
    correo: doc.correo,
    rol: doc.rol,
  };
  if (doc.tipo) usuario.tipo = doc.tipo;
  return usuario;
}

/**
 * @param {{usuariosRepo: import("./puertos/index.js").UsuariosRepo,
 *          hasher: import("./puertos/index.js").Hasher,
 *          tokens: import("./puertos/index.js").Tokens}} deps
 */
export function autenticar({ usuariosRepo, hasher, tokens }) {
  async function login(correo, password) {
    const correoNormalizado = String(correo ?? "").trim().toLowerCase();
    const doc = await usuariosRepo.buscarPorCorreo(correoNormalizado);

    // Inexistente, inactivo o contraseña mala: el mismo error.
    if (!doc || doc.activo === false) throw credencialesInvalidas();
    const coincide = await hasher.comparar(String(password ?? ""), doc.password_hash);
    if (!coincide) throw credencialesInvalidas();

    const usuario = usuarioPublico(doc);
    const token = tokens.firmar({ sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre });
    return { token, usuario };
  }

  async function usuarioDesdeToken(token) {
    let payload;
    try {
      payload = tokens.verificar(token);
    } catch {
      throw noAutenticado();
    }
    // Se consulta la BD para respetar usuarios desactivados después de emitir el token.
    const doc = await usuariosRepo.buscarPorId(payload.sub);
    if (!doc || doc.activo === false) throw noAutenticado();
    return usuarioPublico(doc);
  }

  return { login, usuarioDesdeToken };
}
