import { CATEGORIAS, ESTADOS, PRIORIDADES, EDIFICIOS } from "../catalogo.js";

const campo =
  "mt-1 w-full rounded-md border border-slate-400 bg-white px-2 py-1.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700";

// Un <select> con etiqueta; `opciones` es un objeto valor -> texto.
function Selector({ id, etiqueta, valor, opciones, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {etiqueta}
      </label>
      <select id={id} className={campo} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todas</option>
        {Object.entries(opciones).map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

// Filtros controlados por la URL: `valores` viene del query string.
export default function FiltrosIncidencias({ valores, onCambiar, onLimpiar, hayFiltros }) {
  const edificios = Object.fromEntries(EDIFICIOS.map((e) => [e, e]));
  return (
    <fieldset className="rounded-md border border-slate-200 bg-white p-3">
      <legend className="px-1 text-sm font-semibold text-slate-800">Filtros</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Selector id="f-categoria" etiqueta="Categoría" valor={valores.categoria} opciones={CATEGORIAS} onChange={(v) => onCambiar("categoria", v)} />
        <Selector id="f-estado" etiqueta="Estado" valor={valores.estado} opciones={ESTADOS} onChange={(v) => onCambiar("estado", v)} />
        <Selector id="f-prioridad" etiqueta="Prioridad" valor={valores.prioridad} opciones={PRIORIDADES} onChange={(v) => onCambiar("prioridad", v)} />
        <Selector id="f-edificio" etiqueta="Edificio" valor={valores.edificio} opciones={edificios} onChange={(v) => onCambiar("edificio", v)} />
      </div>
      <button
        type="button"
        onClick={onLimpiar}
        disabled={!hayFiltros}
        className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Limpiar filtros
      </button>
    </fieldset>
  );
}
