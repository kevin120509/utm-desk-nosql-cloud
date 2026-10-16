// Analítica para coordinador y directivo (RF-10, CU-06).
// Dos consultas independientes; cada una muestra gráfica + tabla accesible.
import BarrasHorizontales from "../components/BarrasHorizontales.jsx";
import Cargando from "../components/Cargando.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import { useConsultaAnalitica } from "../hooks/useConsultaAnalitica.js";

const num = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

// Contenedor común de cada sección: encabezado + estados de carga, error y vacío.
function Seccion({ id, titulo, ayuda, consulta, textoVacio, children }) {
  const { cargando, error, datos, recargar } = consulta;
  return (
    <section aria-labelledby={id} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      <h2 id={id} className="text-lg font-semibold text-slate-900">
        {titulo}
      </h2>
      <p className="mt-1 text-sm text-slate-600">{ayuda}</p>
      <div className="mt-4">
        {cargando && <Cargando texto="Calculando métricas…" />}
        {error && <ErrorMensaje error={error} onReintentar={recargar} />}
        {!cargando && !error && datos.length === 0 && <EstadoVacio titulo="Sin datos todavía" texto={textoVacio} />}
        {!cargando && !error && datos.length > 0 && children(datos)}
      </div>
    </section>
  );
}

function TablaEdificios({ datos }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Eficiencia de resolución por edificio</caption>
        <thead className="border-b border-slate-300 text-slate-700">
          <tr>
            <th scope="col" className="py-2 pr-4 font-semibold">Edificio</th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">Promedio de horas de resolución</th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">Total de horas de trabajo</th>
            <th scope="col" className="py-2 text-right font-semibold">Incidencias</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.edificio} className="border-b border-slate-100">
              <th scope="row" className="py-2 pr-4 font-medium text-slate-900">{d.edificio}</th>
              <td className="py-2 pr-4 text-right tabular-nums">{num.format(d.promedio_horas_resolucion)} h</td>
              <td className="py-2 pr-4 text-right tabular-nums">{num.format(d.total_horas_trabajo)} h</td>
              <td className="py-2 text-right tabular-nums">{d.total_incidencias}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaTags({ datos }) {
  return (
    <ol className="mt-4 divide-y divide-slate-100 text-sm">
      {datos.map((d, i) => (
        <li key={d.tag} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
          <span className="w-6 text-right tabular-nums text-slate-500">{i + 1}.</span>
          <span className="font-medium text-slate-900">{d.tag}</span>
          <span className="tabular-nums text-slate-700">
            {d.total} {d.total === 1 ? "incidencia" : "incidencias"}
          </span>
          {d.edificios?.length > 0 && <span className="text-slate-600">en {d.edificios.join(", ")}</span>}
        </li>
      ))}
    </ol>
  );
}

export default function Analitica() {
  const edificios = useConsultaAnalitica("/analitica/edificios");
  const tags = useConsultaAnalitica("/analitica/tags");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-emerald-800">Analítica</h1>
        <p className="mt-1 text-slate-700">Tiempos de resolución por edificio y fallas que se repiten.</p>
      </header>

      <Seccion
        id="sec-edificios"
        titulo="Eficiencia por edificio"
        ayuda="Horas promedio entre el registro y la resolución de las incidencias resueltas o cerradas."
        consulta={edificios}
        textoVacio="Aún no hay incidencias resueltas para calcular métricas."
      >
        {(datos) => (
          <>
            <BarrasHorizontales
              datos={datos}
              claveNombre="edificio"
              claveValor="promedio_horas_resolucion"
              unidad="h"
              descripcion={`Promedio de horas de resolución por edificio. ${datos
                .map((d) => `${d.edificio}: ${num.format(d.promedio_horas_resolucion)} horas`)
                .join("; ")}.`}
            />
            <TablaEdificios datos={datos} />
          </>
        )}
      </Seccion>

      <Seccion
        id="sec-tags"
        titulo="Fallas recurrentes"
        ayuda="Las 10 etiquetas más frecuentes y los edificios donde aparecen."
        consulta={tags}
        textoVacio="Aún no hay etiquetas registradas."
      >
        {(datos) => (
          <>
            <BarrasHorizontales
              datos={datos}
              claveNombre="tag"
              claveValor="total"
              unidad="incidencias"
              descripcion={`Etiquetas más frecuentes. ${datos.map((d) => `${d.tag}: ${d.total}`).join("; ")}.`}
            />
            <ListaTags datos={datos} />
          </>
        )}
      </Seccion>
    </div>
  );
}
