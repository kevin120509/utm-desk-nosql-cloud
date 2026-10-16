import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSesion } from "../auth/SesionContext.jsx";
import { ROLES_CREAR } from "../auth/permisos.js";
import { useListaIncidencias } from "../hooks/useListaIncidencias.js";
import FiltrosIncidencias from "../components/FiltrosIncidencias.jsx";
import ListaIncidencias from "../components/ListaIncidencias.jsx";
import Paginacion from "../components/Paginacion.jsx";
import Cargando from "../components/Cargando.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";

const LIMITE = 10;
const CLAVES_FILTRO = ["categoria", "estado", "prioridad", "edificio"];

// Lista de incidencias: filtros, búsqueda y paginación reflejados en la URL.
export default function Incidencias() {
  const { usuario } = useSesion();
  const [params, setParams] = useSearchParams();

  // Todo el estado de la consulta vive en el query string (compartible/recargable).
  const filtros = Object.fromEntries(CLAVES_FILTRO.map((k) => [k, params.get(k) || ""]));
  const q = (params.get("q") || "").trim();
  const pagina = Math.max(1, parseInt(params.get("pagina"), 10) || 1);
  const enBusqueda = q !== "";
  const hayFiltros = CLAVES_FILTRO.some((k) => filtros[k]);

  // Texto del buscador (se envía al pulsar "Buscar"); parte de lo que hay en la URL.
  const [texto, setTexto] = useState(q);

  // Ruta a consultar: búsqueda por relevancia o listado con filtros.
  let ruta;
  if (enBusqueda) {
    ruta = `/incidencias/buscar?${new URLSearchParams({ q })}`;
  } else {
    const qs = new URLSearchParams({ pagina: String(pagina), limite: String(LIMITE) });
    CLAVES_FILTRO.forEach((k) => filtros[k] && qs.set(k, filtros[k]));
    ruta = `/incidencias?${qs}`;
  }
  const { cargando, error, datos, total, reintentar } = useListaIncidencias(ruta);

  // Actualiza la URL; un valor "" borra la clave. Cambiar filtros vuelve a la página 1.
  function actualizar(reemplazos, conservarPagina = false) {
    const nuevo = new URLSearchParams(params);
    for (const [k, v] of Object.entries(reemplazos)) {
      if (v) nuevo.set(k, v);
      else nuevo.delete(k);
    }
    if (!conservarPagina) nuevo.delete("pagina");
    setParams(nuevo);
  }

  function enviarBusqueda(e) {
    e.preventDefault();
    actualizar({ q: texto.trim() }); // si queda vacío se borra q y no se llama a /buscar
  }

  function cambiarTexto(valor) {
    setTexto(valor);
    // Vaciar el buscador vuelve a la lista.
    if (valor.trim() === "" && q !== "") actualizar({ q: "" });
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-emerald-800">Incidencias</h1>
        {ROLES_CREAR.includes(usuario.rol) && (
          <Link
            to="/incidencias/nueva"
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Nueva incidencia
          </Link>
        )}
      </div>

      <form onSubmit={enviarBusqueda} role="search" className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="buscar" className="sr-only">Buscar incidencias</label>
        <input
          id="buscar"
          type="search"
          value={texto}
          onChange={(e) => cambiarTexto(e.target.value)}
          placeholder="Buscar por texto (título, descripción, etiquetas)"
          className="min-w-0 flex-1 rounded-md border border-slate-400 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700"
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          Buscar
        </button>
      </form>

      {/* En búsqueda los filtros no aplican: /buscar solo recibe q. */}
      {!enBusqueda && (
        <div className="mt-4">
          <FiltrosIncidencias
            valores={filtros}
            hayFiltros={hayFiltros}
            onCambiar={(k, v) => actualizar({ [k]: v })}
            onLimpiar={() => setParams({})}
          />
        </div>
      )}

      {enBusqueda && <p className="mt-4 text-sm text-slate-700">Resultados ordenados por relevancia para «{q}».</p>}

      <div className="mt-4" aria-live="polite">
        {cargando && <Cargando texto="Cargando incidencias…" />}
        {!cargando && error && <ErrorMensaje error={error} onReintentar={reintentar} />}
        {!cargando && !error && datos.length === 0 && (
          <EstadoVacio
            titulo={enBusqueda ? "No hay incidencias que coincidan con la búsqueda" : "No hay incidencias con esos filtros"}
            texto="Prueba con otros criterios."
          />
        )}
        {!cargando && !error && datos.length > 0 && (
          <>
            <ListaIncidencias incidencias={datos} conScore={enBusqueda} />
            {!enBusqueda && (
              <Paginacion
                pagina={pagina}
                limite={LIMITE}
                total={total}
                onCambiar={(p) => actualizar({ pagina: String(p) }, true)}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
