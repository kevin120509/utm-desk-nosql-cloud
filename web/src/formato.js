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
