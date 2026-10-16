import { EtiquetaEstado } from "./Etiquetas.jsx";
import Icono from "./Iconos.jsx";
import { formatearFecha, formatearHoras } from "../formato.js";

// Bitácora en línea de tiempo, la entrada más reciente primero.
// El arreglo llega en orden cronológico; se invierte una copia para mostrarlo.
export default function Bitacora({ historial }) {
  const entradas = [...historial].reverse();
  return (
    <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-[0.9rem] before:top-2 before:w-0.5 before:bg-slate-200">
      {entradas.map((h, i) => {
        const reciente = i === 0;
        return (
          <li key={`${h.fecha}-${i}`} className="relative flex gap-4">
            <span
              aria-hidden="true"
              className={`z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${
                reciente ? "border-marca-600 bg-marca-600 text-white" : "border-slate-300 bg-white text-slate-500"
              }`}
            >
              <Icono nombre={h.estado_anterior ? "reloj" : "mas"} tamano={15} />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {h.estado_anterior && (
                  <>
                    <EtiquetaEstado estado={h.estado_anterior} />
                    <Icono nombre="derecha" tamano={14} className="text-slate-400" />
                  </>
                )}
                <EtiquetaEstado estado={h.estado_nuevo} />
                {typeof h.horas === "number" && h.horas > 0 && (
                  <span className="insignia border-slate-200 bg-slate-50 text-slate-700">{formatearHoras(h.horas)}</span>
                )}
              </p>
              {h.comentario && <p className="mt-2 break-words text-slate-900">{h.comentario}</p>}
              <p className="mt-1 text-sm text-slate-500">
                {h.autor?.nombre && <span className="font-medium text-slate-700">{h.autor.nombre} · </span>}
                <time dateTime={h.fecha}>{formatearFecha(h.fecha)}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
