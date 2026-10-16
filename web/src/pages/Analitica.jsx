// Analítica para coordinador y directivo (RF-10, CU-06).
// Dos consultas independientes; cada una muestra gráfica + tabla accesible, y arriba un resumen.
import BarrasHorizontales from "../components/BarrasHorizontales.jsx";
import Cargando from "../components/Cargando.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import Icono from "../components/Iconos.jsx";
import { useConsultaAnalitica } from "../hooks/useConsultaAnalitica.js";

const num = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

// Tarjeta de indicador (KPI): número grande, etiqueta y una nota breve.
function Indicador({ icono, etiqueta, valor, nota }) {
  return (
    <div className="tarjeta flex items-start gap-4 p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-700">
        <Icono nombre={icono} tamano={22} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-600">{etiqueta}</p>
        <p className="font-display text-3xl font-semibold leading-tight text-slate-900">{valor}</p>
        {nota && <p className="mt-0.5 break-words text-sm text-slate-600">{nota}</p>}
      </div>
    </div>
  );
}

// Resumen general a partir de los datos por edificio.
function Resumen({ datos }) {
  const total = datos.reduce((s, d) => s + d.total_incidencias, 0);
  const horasTrabajo = datos.reduce((s, d) => s + d.total_horas_trabajo, 0);
  // Promedio ponderado por cantidad de incidencias de cada edificio.
  const promedio = total ? datos.reduce((s, d) => s + d.promedio_horas_resolucion * d.total_incidencias, 0) / total : 0;
  const masLento = [...datos].sort((a, b) => b.promedio_horas_resolucion - a.promedio_horas_resolucion)[0];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador icono="check" etiqueta="Incidencias resueltas" valor={total} nota="Resueltas o cerradas" />
      <Indicador icono="reloj" etiqueta="Resolución promedio" valor={`${num.format(promedio)} h`} nota="Desde el registro hasta resolver" />
      <Indicador icono="herramienta" etiqueta="Horas de trabajo" valor={`${num.format(horasTrabajo)} h`} nota="Suma de las intervenciones" />
      <Indicador icono="edificio" etiqueta="Más lento en resolver" valor={masLento.edificio} nota={`${num.format(masLento.promedio_horas_resolucion)} h en promedio`} />
    </div>
  );
}

// Contenedor común de cada sección: encabezado + estados de carga, error y vacío.
function Seccion({ id, titulo, ayuda, consulta, textoVacio, children }) {
  const { cargando, error, datos, recargar } = consulta;
  return (
    <section aria-labelledby={id} className="tarjeta p-5 sm:p-6">
      <h2 id={id} className="text-xl font-semibold text-slate-900">
        {titulo}
      </h2>
      <p className="mt-1 text-slate-600">{ayuda}</p>
      <div className="mt-5">
        {cargando && <Cargando texto="Calculando métricas…" />}
        {error && <ErrorMensaje error={error} onReintentar={recargar} />}
        {!cargando && !error && datos.length === 0 && <EstadoVacio icono="grafica" titulo="Sin datos todavía" texto={textoVacio} />}
        {!cargando && !error && datos.length > 0 && children(datos)}
      </div>
    </section>
  );
}

function TablaEdificios({ datos }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Eficiencia de resolución por edificio</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Edificio</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Promedio de resolución</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Horas de trabajo</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Incidencias</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {datos.map((d) => (
            <tr key={d.edificio} className="hover:bg-marca-50/60">
              <th scope="row" className="px-4 py-3 font-semibold text-slate-900">{d.edificio}</th>
              <td className="px-4 py-3 text-right tabular-nums">{num.format(d.promedio_horas_resolucion)} h</td>
              <td className="px-4 py-3 text-right tabular-nums">{num.format(d.total_horas_trabajo)} h</td>
              <td className="px-4 py-3 text-right tabular-nums">{d.total_incidencias}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaTags({ datos }) {
  return (
    <ol className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
      {datos.map((d, i) => (
        <li key={d.tag} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <span className="grid size-7 place-items-center rounded-full bg-marca-50 text-sm font-semibold text-marca-800">{i + 1}</span>
          <span className="font-semibold text-slate-900">{d.tag}</span>
          <span className="insignia border-slate-200 bg-slate-50 text-slate-700">
            {d.total} {d.total === 1 ? "incidencia" : "incidencias"}
          </span>
          {d.edificios?.length > 0 && <span className="text-sm text-slate-600">en {d.edificios.join(", ")}</span>}
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
        <h1 className="titulo-pagina">Analítica</h1>
        <p className="subtitulo-pagina">Tiempos de resolución por edificio y fallas que se repiten.</p>
      </header>

      {!edificios.cargando && !edificios.error && edificios.datos.length > 0 && <Resumen datos={edificios.datos} />}

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
