// /admin/metricas: indicadores calculados en MongoDB (agregaciones). Cada gráfica va con su tabla.
import BarrasHorizontales from "../../components/BarrasHorizontales.jsx";
import CabeceraAdmin from "../../components/admin/CabeceraAdmin.jsx";
import Cargando from "../../components/Cargando.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import ErrorMensaje from "../../components/ErrorMensaje.jsx";
import { useDatosApi } from "../../hooks/useDatosApi.js";
import { CATEGORIAS, ESTADOS, PRIORIDADES } from "../../catalogo.js";

// Sección con gráfica de barras y tabla accesible con los mismos datos.
function Grafica({ titulo, datos, etiquetas, unidad = "incidencias" }) {
  const filas = datos.map((f) => ({ nombre: etiquetas?.[f.valor] ?? f.valor, total: f.total }));
  return (
    <section aria-labelledby={`g-${titulo}`} className="tarjeta p-5">
      <h2 id={`g-${titulo}`} className="font-semibold text-slate-900">
        {titulo}
      </h2>
      {filas.length === 0 ? (
        <EstadoVacio titulo="Sin datos" texto="Aún no hay incidencias para medir." />
      ) : (
        <>
          <div className="mt-3">
            <BarrasHorizontales datos={filas} claveNombre="nombre" claveValor="total" unidad={unidad} descripcion={`${titulo}: ${filas.map((f) => `${f.nombre} ${f.total}`).join(", ")}`} />
          </div>
          <table className="sr-only">
            <caption>{titulo}</caption>
            <tbody>
              {filas.map((f) => (
                <tr key={f.nombre}>
                  <th scope="row">{f.nombre}</th>
                  <td>{f.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

export default function AdminMetricas() {
  const m = useDatosApi("/admin/metricas");
  const d = m.datos;

  return (
    <>
      <CabeceraAdmin titulo="Métricas" descripcion="Cifras calculadas directamente en MongoDB Atlas a partir de las incidencias." />

      {m.cargando && <Cargando texto="Calculando métricas…" />}
      {m.error && <ErrorMensaje error={m.error} onReintentar={m.recargar} />}

      {d && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="tarjeta p-5">
              <p className="text-sm text-slate-600">Tiempo promedio de resolución</p>
              <p className="font-display text-3xl font-semibold text-slate-900">{d.tiempo_resolucion.promedio_horas} h</p>
              <p className="text-sm text-slate-600">Sobre {d.tiempo_resolucion.resueltas} incidencias resueltas o cerradas</p>
            </div>
            <div className="tarjeta p-5">
              <p className="text-sm text-slate-600">Generado</p>
              <p className="text-sm font-medium text-slate-900">{new Date(d.generado_en).toLocaleString("es-MX")}</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Grafica titulo="Incidencias por categoría" datos={d.por_categoria} etiquetas={CATEGORIAS} />
            <Grafica titulo="Incidencias por estado" datos={d.por_estado} etiquetas={ESTADOS} />
            <Grafica titulo="Incidencias por prioridad" datos={d.por_prioridad} etiquetas={PRIORIDADES} />
            <Grafica titulo="Incidencias por edificio" datos={d.por_edificio} />
          </div>

          <section aria-labelledby="tecnicos-top" className="tarjeta p-5">
            <h2 id="tecnicos-top" className="font-semibold text-slate-900">Técnicos con más incidencias asignadas</h2>
            {d.tecnicos_con_mas_incidencias.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">Ningún técnico tiene incidencias asignadas todavía.</p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-slate-700">
                  <tr>
                    <th scope="col" className="py-2 font-semibold">Técnico</th>
                    <th scope="col" className="py-2 text-right font-semibold">Incidencias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {d.tecnicos_con_mas_incidencias.map((t) => (
                    <tr key={t.valor}>
                      <td className="py-2 text-slate-900">{t.valor}</td>
                      <td className="py-2 text-right tabular-nums">{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-labelledby="recurrentes" className="tarjeta p-5">
            <h2 id="recurrentes" className="font-semibold text-slate-900">Fallas recurrentes</h2>
            <p className="mt-1 text-sm text-slate-600">Espacios con dos o más incidencias.</p>
            {d.recurrentes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No hay espacios con fallas repetidas.</p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-slate-700">
                  <tr>
                    <th scope="col" className="py-2 font-semibold">Edificio</th>
                    <th scope="col" className="py-2 font-semibold">Espacio</th>
                    <th scope="col" className="py-2 text-right font-semibold">Incidencias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {d.recurrentes.map((r) => (
                    <tr key={`${r.edificio}-${r.espacio}`}>
                      <td className="py-2 text-slate-900">{r.edificio}</td>
                      <td className="py-2 text-slate-900">{r.espacio}</td>
                      <td className="py-2 text-right tabular-nums">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </>
  );
}
