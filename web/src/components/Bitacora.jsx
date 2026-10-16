import { EtiquetaEstado } from "./Etiquetas.jsx";
import { formatearFecha, formatearHoras } from "../formato.js";

// Bitácora en línea de tiempo, la entrada más reciente primero.
// El arreglo llega en orden cronológico; se invierte una copia para mostrarlo.
export default function Bitacora({ historial }) {
  const entradas = [...historial].reverse();
  return (
    <ol className="space-y-4 border-l-2 border-slate-300 pl-4">
      {entradas.map((h, i) => (
        <li key={`${h.fecha}-${i}`} className="relative">
          <span aria-hidden="true" className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-700" />
          <p className="text-sm text-slate-600">
            <time dateTime={h.fecha}>{formatearFecha(h.fecha)}</time>
            {h.autor?.nombre && <> · {h.autor.nombre}</>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            {h.estado_anterior && (
              <>
                <EtiquetaEstado estado={h.estado_anterior} />
                <span aria-label="cambió a">→</span>
              </>
            )}
            <EtiquetaEstado estado={h.estado_nuevo} />
            {typeof h.horas === "number" && h.horas > 0 && (
              <span className="text-sm text-slate-700">{formatearHoras(h.horas)}</span>
            )}
          </p>
          {h.comentario && <p className="mt-1 break-words text-slate-900">{h.comentario}</p>}
        </li>
      ))}
    </ol>
  );
}
