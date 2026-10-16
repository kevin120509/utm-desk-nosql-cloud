import { Link } from "react-router-dom";
import { CATEGORIAS } from "../catalogo.js";
import { EtiquetaEstado, EtiquetaPrioridad, BORDE_PRIORIDAD } from "./Etiquetas.jsx";
import Icono from "./Iconos.jsx";

const fmtFecha = (f) => {
  const d = new Date(f);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};
const lugar = (i) => [i.ubicacion?.edificio, i.ubicacion?.espacio].filter(Boolean).join(" · ");

// Relevancia (solo en búsqueda).
const Score = ({ score }) =>
  score === undefined ? null : <span className="text-xs font-medium text-slate-600">Relevancia {Number(score).toFixed(2)}</span>;

// Datos secundarios de una incidencia (categoría, lugar) con icono.
const Meta = ({ i }) => (
  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
    <span className="inline-flex items-center gap-1.5">
      <Icono nombre="herramienta" tamano={15} className="text-slate-400" />
      {CATEGORIAS[i.categoria] || i.categoria}
    </span>
    <span className="inline-flex items-center gap-1.5">
      <Icono nombre="lugar" tamano={15} className="text-slate-400" />
      {lugar(i)}
    </span>
  </p>
);

// Tabla en escritorio (md+) y tarjetas en móvil. Sin scroll horizontal.
export default function ListaIncidencias({ incidencias, conScore }) {
  return (
    <>
      <div className="tarjeta hidden overflow-hidden md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Lista de incidencias</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Incidencia</th>
              <th scope="col" className="w-28 px-3 py-3 font-semibold">Prioridad</th>
              <th scope="col" className="w-36 px-3 py-3 font-semibold">Estado</th>
              <th scope="col" className="hidden w-40 px-3 py-3 font-semibold xl:table-cell">Responsable</th>
              <th scope="col" className="w-32 px-3 py-3 font-semibold">Creada</th>
              {conScore && <th scope="col" className="w-28 px-3 py-3 font-semibold">Relevancia</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incidencias.map((i) => (
              <tr key={i.codigo} className="transition-colors duration-150 hover:bg-marca-50/60">
                <td className={`border-l-4 px-4 py-3.5 ${BORDE_PRIORIDAD[i.prioridad] || "border-l-slate-200"}`}>
                  <p className="font-mono text-xs font-medium tracking-wide text-slate-500">{i.codigo}</p>
                  <Link to={`/incidencias/${i.codigo}`} className="mt-0.5 block break-words font-semibold text-slate-900 hover:text-marca-700 hover:underline">
                    {i.titulo}
                  </Link>
                  <Meta i={i} />
                </td>
                <td className="px-3 py-3.5 align-top"><EtiquetaPrioridad prioridad={i.prioridad} /></td>
                <td className="px-3 py-3.5 align-top"><EtiquetaEstado estado={i.estado} /></td>
                <td className="hidden px-3 py-3.5 align-top text-sm text-slate-700 xl:table-cell">
                  {i.asignado_a?.nombre || <span className="text-slate-500">Sin asignar</span>}
                </td>
                <td className="px-3 py-3.5 align-top text-sm text-slate-700">{fmtFecha(i.fecha_creacion)}</td>
                {conScore && <td className="px-3 py-3.5 align-top"><Score score={i.score} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {incidencias.map((i) => (
          <li key={i.codigo} className={`tarjeta border-l-4 p-4 ${BORDE_PRIORIDAD[i.prioridad] || "border-l-slate-200"}`}>
            <p className="font-mono text-xs font-medium tracking-wide text-slate-500">{i.codigo}</p>
            <Link to={`/incidencias/${i.codigo}`} className="mt-0.5 block break-words text-lg font-semibold leading-snug text-slate-900 hover:text-marca-700">
              {i.titulo}
            </Link>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <EtiquetaPrioridad prioridad={i.prioridad} />
              <EtiquetaEstado estado={i.estado} />
            </div>
            <Meta i={i} />
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
              <Icono nombre="calendario" tamano={15} className="text-slate-400" />
              {fmtFecha(i.fecha_creacion)}
              {i.asignado_a?.nombre && <span className="text-slate-500"> · {i.asignado_a.nombre}</span>}
            </p>
            {conScore && <Score score={i.score} />}
          </li>
        ))}
      </ul>
    </>
  );
}
