// Adaptador del puerto Almacen sobre Supabase Storage (bucket PRIVADO).
// Usa la secret key del proyecto: solo vive en el servidor, nunca llega al navegador.
import { createClient } from "@supabase/supabase-js";

export class AlmacenSupabase {
  /**
   * @param {{url: string, claveSecreta: string, bucket?: string}} config
   */
  constructor({ url, claveSecreta, bucket = "evidencias" }) {
    this.bucket = bucket;
    // Sin sesión de usuario: es un cliente de servidor.
    this.cliente = createClient(url, claveSecreta, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  /** Sube el archivo. Falla si la ruta ya existe (upsert apagado). */
  async subir({ ruta, buffer, tipoMime }) {
    const { error } = await this.cliente.storage.from(this.bucket).upload(ruta, buffer, {
      contentType: tipoMime,
      upsert: false,
    });
    if (error) throw new Error(`No se pudo subir el archivo al almacén: ${error.message}`);
  }

  /** URL firmada temporal para leer un objeto privado. */
  async urlFirmada(ruta, segundos) {
    const { data, error } = await this.cliente.storage.from(this.bucket).createSignedUrl(ruta, segundos);
    if (error || !data?.signedUrl) {
      throw new Error(`No se pudo firmar la URL del archivo: ${error?.message ?? "sin respuesta"}`);
    }
    return { url: data.signedUrl, expira: new Date(Date.now() + segundos * 1000) };
  }

  /** Borra objetos por ruta. Lanza si falla. */
  async eliminarArchivos(rutas) {
    if (!rutas?.length) return;
    const { error } = await this.cliente.storage.from(this.bucket).remove(rutas);
    if (error) throw new Error(`No se pudieron borrar archivos del almacén: ${error.message}`);
  }
}
