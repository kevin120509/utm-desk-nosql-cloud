import { Link } from "react-router-dom";
import { useDatosApi } from "../hooks/useDatosApi.js";
import { hace } from "../formato.js";
import { EtiquetaEstado } from "./Etiquetas.jsx";
import Icono from "./Iconos.jsx";

// Panel del reportante: sus incidencias con actividad posterior a `desde`
// (marca de su última visita, guardada en localStorage por usuario).
// Pide hasta 50 propias — el servidor ya filtra por reportante — y se
// ordenan por fecha_actualizacion, no por creación. Si falla la carga o
// no hay novedades, la sección simplemente no se pinta.
export default function NovedadesReportante({ desde }) {
  const { datos } = useDatosApi("/incidencias?pagina=1&limite=50");
  const corte = desde ? new Date(desde).getTime() : 0;

  const novedades = (datos?.datos || [])
    .map((i) => ({ ...i, actividad: i.fecha_actualizacion || i.fecha_creacion }))
    .filter((i) => new Date(i.actividad).getTime() > corte)
    .sort((a, b) => new Date(b.actividad) - new Date(a.actividad))
    .slice(0, 4);

  if (novedades.length === 0) return null;

  return (
    <section aria-labelledby="titulo-novedades" className="mt-6">
      <h2 id="titulo-novedades" className="flex items-center gap-2.5 font-display text-base font-semibold text-slate-900">
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-acento text-marca-950">
          <Icono nombre="campana" tamano={15} />
        </span>
        Novedades en tus reportes
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {novedades.map((i) => (
          <li key={i.codigo}>
            <Link
              to={`/incidencias/${i.codigo}`}
              className="group flex h-full flex-col gap-1.5 rounded-xl border border-slate-300 border-l-4 border-l-[color:var(--color-acento)] bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-500">{i.codigo}</span>
                <span className="text-xs font-medium text-slate-500">{hace(i.actividad)}</span>
              </span>
              <span className="font-semibold leading-snug text-slate-900 group-hover:text-marca-800">{i.titulo}</span>
              <span className="mt-auto pt-1">
                <EtiquetaEstado estado={i.estado} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
