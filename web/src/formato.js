// Utilidades de formato para el expediente (fechas en español, zona de Mérida).
const ZONA = "America/Merida";

// Convierte un valor ISO a texto legible: "15 oct 2026, 14:30". Devuelve "" si no hay fecha válida.
export function formatearFecha(valor) {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Peso: KB si es menor a 1 MB; si no, MB con un decimal.
export function formatearPeso(kb) {
  if (typeof kb !== "number") return "";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

// Horas con hasta 2 decimales, sin ceros sobrantes: 1.5 -> "1.5 h".
export function formatearHoras(h) {
  if (typeof h !== "number") return "";
  return `${Number(h.toFixed(2))} h`;
}

// Tiempo relativo corto: "ahora mismo", "hace 5 min", "hace 3 h", "hace 2 días".
// Pasado de 30 días devuelve la fecha completa.
export function hace(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "ahora mismo";
  const min = Math.floor(s / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 30) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
  return formatearFecha(valor);
}
