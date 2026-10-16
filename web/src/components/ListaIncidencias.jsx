import { Link } from "react-router-dom";
import { CATEGORIAS } from "../catalogo.js";
import { EtiquetaEstado, EtiquetaPrioridad } from "./Etiquetas.jsx";

const fmtFecha = (f) => {
  const d = new Date(f);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};
const lugar = (i) => [i.ubicacion?.edificio, i.ubicacion?.espacio].filter(Boolean).join(" · ");
const enlace =
  "font-semibold text-emerald-800 underline hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

// Relevancia (solo en búsqueda).
const Score = ({ score }) =>
  score === undefined ? null : <span className="text-xs text-slate-700">Relevancia: {Number(score).toFixed(2)}</span>;

// Tabla en escritorio (md+) y tarjetas en móvil. Sin scroll horizontal.
export default function ListaIncidencias({ incidencias, conScore }) {
  return (
    <>
      <table className="hidden w-full table-fixed border-collapse bg-white text-sm md:table">
        <caption className="sr-only">Lista de incidencias</caption>
        <thead>
          <tr className="border-b border-slate-300 text-left text-slate-800">
            <th scope="col" className="w-28 p-2">Código</th>
            <th scope="col" className="p-2">Título</th>
            <th scope="col" className="w-36 p-2">Categoría</th>
            <th scope="col" className="w-24 p-2">Prioridad</th>
            <th scope="col" className="w-28 p-2">Estado</th>
            <th scope="col" className="w-44 p-2">Ubicación</th>
            <th scope="col" className="w-28 p-2">Creada</th>
            {conScore && <th scope="col" className="w-24 p-2">Relevancia</th>}
          </tr>
        </thead>
        <tbody>
          {incidencias.map((i) => (
            <tr key={i.codigo} className="border-b border-slate-200 align-top">
              <td className="p-2"><Link to={`/incidencias/${i.codigo}`} className={enlace}>{i.codigo}</Link></td>
              <td className="break-words p-2">{i.titulo}</td>
              <td className="p-2">{CATEGORIAS[i.categoria] || i.categoria}</td>
              <td className="p-2"><EtiquetaPrioridad prioridad={i.prioridad} /></td>
              <td className="p-2"><EtiquetaEstado estado={i.estado} /></td>
              <td className="break-words p-2">{lugar(i)}</td>
              <td className="p-2">{fmtFecha(i.fecha_creacion)}</td>
              {conScore && <td className="p-2"><Score score={i.score} /></td>}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="space-y-3 md:hidden">
        {incidencias.map((i) => (
          <li key={i.codigo} className="rounded-md border border-slate-200 bg-white p-3">
            <Link to={`/incidencias/${i.codigo}`} className={enlace}>{i.codigo}</Link>
            <p className="mt-1 break-words font-medium text-slate-900">{i.titulo}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <EtiquetaPrioridad prioridad={i.prioridad} />
              <EtiquetaEstado estado={i.estado} />
            </div>
            <p className="mt-2 text-sm text-slate-700">
              {CATEGORIAS[i.categoria] || i.categoria} · {lugar(i)}
            </p>
            <p className="text-sm text-slate-700">{fmtFecha(i.fecha_creacion)}</p>
            {conScore && <Score score={i.score} />}
          </li>
        ))}
      </ul>
    </>
  );
}
