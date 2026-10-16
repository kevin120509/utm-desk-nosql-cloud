// Archivos de muestra para las evidencias del seed. Se generan en memoria (sin dependencias):
// un PNG válido de color sólido y un PDF de una página. Pesan pocos KB y se ven bien en la UI.
import { deflateSync } from "node:zlib";

// CRC-32 (lo exige el formato PNG en cada bloque).
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloque(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/**
 * PNG RGB de color sólido con una franja más oscura arriba (para que no parezca un error).
 * @param {number} ancho @param {number} alto @param {[number, number, number]} rgb
 */
export function crearPng(ancho, alto, rgb) {
  const filas = [];
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3); // 1 byte de filtro (0) + píxeles
    const factor = y < alto * 0.12 ? 0.6 : 1;
    for (let x = 0; x < ancho; x++) {
      fila[1 + x * 3] = Math.round(rgb[0] * factor);
      fila[2 + x * 3] = Math.round(rgb[1] * factor);
      fila[3 + x * 3] = Math.round(rgb[2] * factor);
    }
    filas.push(fila);
  }
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ancho, 0);
  cabecera.writeUInt32BE(alto, 4);
  cabecera[8] = 8; // profundidad de bits
  cabecera[9] = 2; // color RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque("IHDR", cabecera),
    bloque("IDAT", deflateSync(Buffer.concat(filas))),
    bloque("IEND", Buffer.alloc(0)),
  ]);
}

/** PDF de una página con un texto corto (Helvetica). Solo ASCII. */
export function crearPdf(titulo) {
  const texto = String(titulo).replace(/[()\\]/g, " ");
  const flujo = `BT /F1 18 Tf 72 720 Td (${texto}) Tj ET`;
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let salida = "%PDF-1.4\n";
  const posiciones = [];
  objetos.forEach((cuerpo, i) => {
    posiciones.push(salida.length);
    salida += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });
  const inicioXref = salida.length;
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const pos of posiciones) salida += `${String(pos).padStart(10, "0")} 00000 n \n`;
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(salida, "latin1");
}

/** Catálogo de muestras: clave -> { buffer, tipoMime, nombre }. */
export function crearMuestras() {
  return {
    "png-verde": { buffer: crearPng(480, 270, [46, 125, 50]), tipoMime: "image/png" },
    "png-azul": { buffer: crearPng(480, 270, [21, 101, 192]), tipoMime: "image/png" },
    "png-naranja": { buffer: crearPng(480, 270, [230, 120, 20]), tipoMime: "image/png" },
    "pdf-diagnostico": { buffer: crearPdf("Diagnostico tecnico - UTM Desk (muestra)"), tipoMime: "application/pdf" },
  };
}
