// Almacén que no hace nada. Sirve mientras B09 no implemente el adaptador de Supabase.
export class AlmacenNulo {
  /** @param {string[]} paths */
  async eliminarArchivos(paths) {
    console.warn(
      `Almacén de archivos no configurado: B09 lo implementa con Supabase (se omiten ${paths.length} archivo(s))`
    );
  }
}
