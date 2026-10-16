// Archivos mínimos pero REALES (con su firma de bytes) para probar evidencias.

// PNG 1x1 válido.
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// JPEG mínimo con firma válida (SOI + JFIF + EOI).
export const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

// PDF mínimo con firma %PDF-.
export const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\n" +
    "trailer<</Root 1 0 R>>\n%%EOF\n",
);

// Un "ejecutable" de Windows (firma MZ) que un usuario renombra a .png.
export const EXE = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200, 0x90)]);

// Texto plano: no es ninguno de los tipos permitidos.
export const TEXTO = Buffer.from("esto no es una imagen ni un pdf");
