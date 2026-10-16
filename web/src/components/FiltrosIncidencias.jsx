import { CATEGORIAS, ESTADOS, PRIORIDADES, EDIFICIOS } from "../catalogo.js";
import Icono from "./Iconos.jsx";

// Un <select> con etiqueta; `opciones` es un objeto valor -> texto.
function Selector({ id, etiqueta, valor, opciones, onChange }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="etiqueta-campo">
        {etiqueta}
      </label>
      <select id={id} className="campo mt-1.5" value={valor} onChange={(e) => onChange(e.target.value)}>
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
// El estado se elige con "pastillas" (un clic) porque es el filtro que más se usa.
export default function FiltrosIncidencias({ valores, onCambiar, onLimpiar, hayFiltros }) {
  const edificios = Object.fromEntries(EDIFICIOS.map((e) => [e, e]));
  const pastillas = [["", "Todas"], ...Object.entries(ESTADOS)];
  return (
    <section aria-label="Filtros" className="tarjeta p-4">
      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {pastillas.map(([valor, texto]) => {
          const activa = valores.estado === valor;
          return (
            <button
              key={valor || "todas"}
              type="button"
              aria-pressed={activa}
              onClick={() => onCambiar("estado", valor)}
              className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors duration-150 ${
                activa
                  ? "border-marca-700 bg-marca-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {texto}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Selector id="f-categoria" etiqueta="Categoría" valor={valores.categoria} opciones={CATEGORIAS} onChange={(v) => onCambiar("categoria", v)} />
        <Selector id="f-prioridad" etiqueta="Prioridad" valor={valores.prioridad} opciones={PRIORIDADES} onChange={(v) => onCambiar("prioridad", v)} />
        <Selector id="f-edificio" etiqueta="Edificio" valor={valores.edificio} opciones={edificios} onChange={(v) => onCambiar("edificio", v)} />
        <button type="button" onClick={onLimpiar} disabled={!hayFiltros} className="btn btn-secundario">
          <Icono nombre="cerrar" tamano={16} />
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}
