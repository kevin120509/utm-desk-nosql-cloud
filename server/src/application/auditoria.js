// Auditoría: convierte hechos (acción administrativa, login, acceso denegado) en eventos de bitácora.
// Los eventos de seguridad son de "mejor esfuerzo" (no deben tumbar el login); las acciones
// administrativas usan `registrarAdmin`, que SÍ propaga el error.
const recorte = (txt, n = 120) => String(txt ?? "").slice(0, n);

/** @param {{bitacoraRepo: {registrar: Function}, reloj?: () => Date}} deps */
export function crearAuditor({ bitacoraRepo, reloj = () => new Date() }) {
  const actorDe = (u) => (u ? { id: String(u.id), nombre: u.nombre, rol: u.rol } : undefined);

  async function seguridad(accion, datos) {
    try {
      await bitacoraRepo.registrar({ tipo: "seguridad", accion, fecha: reloj(), ...datos });
    } catch (e) {
      console.error("No se pudo registrar el evento de seguridad:", e?.message);
    }
  }

  return {
    /** Acción administrativa: si no se puede registrar, la operación completa falla. */
    registrarAdmin: (accion, actor, objetivo, detalle) =>
      bitacoraRepo.registrar({ tipo: "admin", accion, fecha: reloj(), actor: actorDe(actor), objetivo, detalle }),
    loginOk: ({ usuario, ip }) => seguridad("login.ok", { actor: actorDe(usuario), ip: recorte(ip, 60) }),
    loginFallido: ({ correo, ip }) =>
      seguridad("login.fallido", { detalle: { correo: recorte(correo) }, ip: recorte(ip, 60) }),
    accesoDenegado: ({ usuario, metodo, ruta, motivo, ip }) =>
      seguridad("acceso.denegado", {
        actor: actorDe(usuario),
        detalle: { metodo, ruta: recorte(ruta, 200), motivo },
        ip: recorte(ip, 60),
      }),
    registroPublico: ({ usuario, ip }) =>
      seguridad("usuario.registro", {
        actor: actorDe(usuario),
        objetivo: { tipo: "usuario", id: String(usuario.id) },
        ip: recorte(ip, 60),
      }),
  };
}
