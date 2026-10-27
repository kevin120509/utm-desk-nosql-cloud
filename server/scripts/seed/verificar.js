// Verificación del conjunto de datos contra lo que exige el enunciado (§4.1) y el plan (§9).
// Función PURA: recibe los documentos (del generador o leídos de Atlas) y devuelve resultados.
import { detalleComputoRedes, detalleInfraestructura, detalleAcademico } from "../../src/domain/index.js";

const MS_DIA = 24 * 3_600_000;
const ESQUEMA_DETALLE = {
  computo_redes: detalleComputoRedes,
  infraestructura_fisica: detalleInfraestructura,
  servicios_academicos: detalleAcademico,
};

function contar(docs, f) {
  const r = {};
  for (const d of docs) r[f(d)] = (r[f(d)] ?? 0) + 1;
  return r;
}

/**
 * @param {object[]} docs  Incidencias (con Date reales).
 * @param {{ahora?: Date}} [opciones]
 * @returns {Array<{nombre: string, ok: boolean, detalle: string}>}
 */
export function verificarConjunto(docs, { ahora = new Date() } = {}) {
  const r = [];
  const chequeo = (nombre, ok, detalle) => r.push({ nombre, ok: Boolean(ok), detalle });

  chequeo("Entre 20 y 30 incidencias", docs.length >= 20 && docs.length <= 30, `${docs.length}`);

  const porCategoria = contar(docs, (d) => d.categoria);
  const cuentas = Object.values(porCategoria);
  chequeo(
    "Categorías balanceadas (3, diferencia máxima 1)",
    cuentas.length === 3 && Math.max(...cuentas) - Math.min(...cuentas) <= 1,
    JSON.stringify(porCategoria),
  );

  const edificios = new Set(docs.map((d) => d.ubicacion.edificio));
  chequeo("Al menos 4 edificios o zonas", edificios.size >= 4, `${edificios.size}: ${[...edificios].join(", ")}`);

  const prioridades = contar(docs, (d) => d.prioridad);
  chequeo(
    "Las 4 prioridades presentes",
    ["baja", "media", "alta", "critica"].every((p) => prioridades[p] > 0),
    JSON.stringify(prioridades),
  );

  const estados = contar(docs, (d) => d.estado);
  chequeo(
    "Los 5 estados presentes",
    ["abierta", "en proceso", "en espera", "resuelta", "cerrada"].every((e) => estados[e] > 0),
    JSON.stringify(estados),
  );

  const conResolucion = docs.filter((d) => d.fecha_resolucion !== undefined);
  chequeo("Al menos 8 con fecha_resolucion", conResolucion.length >= 8, `${conResolucion.length}`);
  chequeo(
    "fecha_resolucion es Date y solo existe en resuelta/cerrada (y en todas ellas)",
    docs.every((d) => {
      const finalizada = d.estado === "resuelta" || d.estado === "cerrada";
      return finalizada ? d.fecha_resolucion instanceof Date : d.fecha_resolucion === undefined;
    }),
    "",
  );
  const edades = conResolucion.map((d) => (ahora - d.fecha_resolucion) / MS_DIA);
  chequeo(
    "fecha_resolucion reciente (entre 0 y 45 días: el TTL de 60 días no las borra pronto)",
    edades.length > 0 && edades.every((e) => e >= 0 && e <= 45),
    edades.length ? `de ${Math.min(...edades).toFixed(1)} a ${Math.max(...edades).toFixed(1)} días` : "ninguna",
  );

  const conEvidencias = docs.filter((d) => d.evidencias_adjuntas.length > 0);
  chequeo("Al menos 15 con evidencias_adjuntas", conEvidencias.length >= 15, `${conEvidencias.length}`);

  const espacios = contar(docs, (d) => `${d.ubicacion.edificio} / ${d.ubicacion.espacio}`);
  const recurrentes = Object.entries(espacios).filter(([, n]) => n >= 3);
  chequeo("Incidencias recurrentes (un mismo espacio con 3 o más)", recurrentes.length >= 2, JSON.stringify(Object.fromEntries(recurrentes)));

  const tags = contar(docs.flatMap((d) => d.tags), (t) => t);
  chequeo("Al menos 10 etiquetas distintas y alguna repetida 4 o más veces", Object.keys(tags).length >= 10 && Math.max(...Object.values(tags)) >= 4, `${Object.keys(tags).length} distintas`);

  chequeo("Códigos únicos", new Set(docs.map((d) => d.codigo)).size === docs.length, "");

  const detalleMal = docs.filter((d) => !ESQUEMA_DETALLE[d.categoria]?.safeParse(d.detalle_especifico).success);
  chequeo("detalle_especifico válido para su categoría (Zod)", detalleMal.length === 0, detalleMal.map((d) => d.codigo).join(", "));

  const horasMal = docs.filter((d) => {
    const suma = d.historial_seguimiento.reduce((s, h) => s + h.horas, 0);
    return Math.abs(suma - d.horas_invertidas) > 1e-9;
  });
  chequeo("horas_invertidas = suma de la bitácora", horasMal.length === 0, horasMal.map((d) => d.codigo).join(", "));

  const sinHistorial = docs.filter((d) => !d.historial_seguimiento?.length);
  chequeo("Toda incidencia tiene historial inicial", sinHistorial.length === 0, "");

  chequeo("Ningún campo null ni cadena vacía", !contieneNuloOVacio(docs), "");

  return r;
}

function contieneNuloOVacio(valor) {
  if (valor === null || valor === "") return true;
  if (valor instanceof Date) return false;
  if (Array.isArray(valor)) return valor.some(contieneNuloOVacio);
  if (valor && typeof valor === "object" && valor.constructor === Object) {
    return Object.values(valor).some(contieneNuloOVacio);
  }
  return false;
}

/** Imprime los resultados y devuelve true si todos pasaron. */
export function imprimirVerificacion(resultados, log = console.log) {
  for (const x of resultados) log(`${x.ok ? "OK   " : "FALLA"} ${x.nombre}${x.detalle ? ` — ${x.detalle}` : ""}`);
  return resultados.every((x) => x.ok);
}
