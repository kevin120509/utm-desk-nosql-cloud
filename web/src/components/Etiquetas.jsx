import { ESTADOS, PRIORIDADES } from "../catalogo.js";

// Colores con contraste AA (texto oscuro sobre fondo claro). Además del color
// siempre se muestra el texto, así no depende solo del color.
const COLOR_ESTADO = {
  abierta: "bg-blue-100 text-blue-900 border-blue-300",
  "en proceso": "bg-amber-100 text-amber-900 border-amber-300",
  "en espera": "bg-slate-200 text-slate-900 border-slate-400",
  resuelta: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cerrada: "bg-slate-100 text-slate-700 border-slate-300",
};

const COLOR_PRIORIDAD = {
  baja: "bg-slate-100 text-slate-800 border-slate-300",
  media: "bg-yellow-100 text-yellow-900 border-yellow-300",
  alta: "bg-orange-100 text-orange-900 border-orange-300",
  critica: "bg-red-100 text-red-900 border-red-300",
};

const base = "inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold";

export function EtiquetaEstado({ estado }) {
  return <span className={`${base} ${COLOR_ESTADO[estado] || COLOR_ESTADO.cerrada}`}>{ESTADOS[estado] || estado}</span>;
}

export function EtiquetaPrioridad({ prioridad }) {
  return (
    <span className={`${base} ${COLOR_PRIORIDAD[prioridad] || COLOR_PRIORIDAD.baja}`}>
      {PRIORIDADES[prioridad] || prioridad}
    </span>
  );
}
