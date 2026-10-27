// Almacén que no hace nada. Se usa cuando Supabase no está configurado (sin variables de entorno).
const SIN_CONFIGURAR = "Almacén de archivos no configurado (faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)";

export class AlmacenNulo {
  /** @param {string[]} paths */
  async eliminarArchivos(paths) {
    console.warn(`${SIN_CONFIGURAR}: se omiten ${paths.length} archivo(s)`);
  }

  async salud() {
    return { ok: false, detalle: "No configurado" };
  }

  async subir() {
    throw new Error(SIN_CONFIGURAR);
  }

  async urlFirmada() {
    throw new Error(SIN_CONFIGURAR);
  }

  // Estado para el panel de sistema (no lanza: "no configurado" es un estado válido).
  async comprobar() {
    return { estado: "no_configurado" };
  }
}
