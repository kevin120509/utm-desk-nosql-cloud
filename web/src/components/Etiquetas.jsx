import { ESTADOS, PRIORIDADES } from "../catalogo.js";

// Insignias de estado y prioridad. Cumplen contraste AA (texto oscuro sobre fondo claro) y NUNCA
// dependen solo del color: llevan texto y un punto/forma distinta por estado.
const COLOR_ESTADO = {
  abierta: { caja: "bg-sky-50 text-sky-900 border-sky-300", punto: "bg-sky-600" },
  "en proceso": { caja: "bg-amber-50 text-amber-900 border-amber-300", punto: "bg-amber-500" },
  "en espera": { caja: "bg-violet-50 text-violet-900 border-violet-300", punto: "bg-violet-500" },
  resuelta: { caja: "bg-emerald-50 text-emerald-900 border-emerald-300", punto: "bg-emerald-600" },
  cerrada: { caja: "bg-slate-100 text-slate-700 border-slate-300", punto: "bg-slate-500" },
};

const COLOR_PRIORIDAD = {
  baja: { caja: "bg-slate-50 text-slate-800 border-slate-300", marca: "▁" },
  media: { caja: "bg-yellow-50 text-yellow-900 border-yellow-300", marca: "▃" },
  alta: { caja: "bg-orange-50 text-orange-900 border-orange-300", marca: "▅" },
  critica: { caja: "bg-red-50 text-red-900 border-red-300", marca: "▇" },
};

// Borde de color a la izquierda de cada fila/tarjeta según la prioridad.
export const BORDE_PRIORIDAD = {
  baja: "border-l-slate-300",
  media: "border-l-yellow-400",
  alta: "border-l-orange-500",
  critica: "border-l-red-600",
};

export function EtiquetaEstado({ estado }) {
  const c = COLOR_ESTADO[estado] || COLOR_ESTADO.cerrada;
  return (
    <span className={`insignia ${c.caja}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${c.punto}`} />
      {ESTADOS[estado] || estado}
    </span>
  );
}

export function EtiquetaPrioridad({ prioridad }) {
  const c = COLOR_PRIORIDAD[prioridad] || COLOR_PRIORIDAD.baja;
  return (
    <span className={`insignia ${c.caja}`}>
      <span aria-hidden="true" className="font-mono text-[0.7rem] leading-none">
        {c.marca}
      </span>
      {PRIORIDADES[prioridad] || prioridad}
    </span>
  );
}
