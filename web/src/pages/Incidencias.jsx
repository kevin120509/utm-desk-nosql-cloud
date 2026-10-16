import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useSesion } from "../auth/SesionContext.jsx";
import { ROLES_CREAR } from "../auth/permisos.js";
import { useListaIncidencias } from "../hooks/useListaIncidencias.js";
import FiltrosIncidencias from "../components/FiltrosIncidencias.jsx";
import ListaIncidencias from "../components/ListaIncidencias.jsx";
import Paginacion from "../components/Paginacion.jsx";
import Cargando from "../components/Cargando.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import Icono from "../components/Iconos.jsx";

const LIMITE = 10;
const CLAVES_FILTRO = ["categoria", "estado", "prioridad", "edificio"];

// Lista de incidencias: filtros, búsqueda y paginación reflejados en la URL.
export default function Incidencias() {
  const { usuario } = useSesion();
  const [params, setParams] = useSearchParams();
  const eliminada = useLocation().state?.eliminada; // viene de borrar una incidencia en el detalle

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

  const esReportante = usuario.rol === "reportante";

  return (
    <section>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">Incidencias</h1>
          <p className="subtitulo-pagina">
            {esReportante ? "Tus reportes y su avance." : "Todas las incidencias del campus: filtra, busca y da seguimiento."}
          </p>
        </div>
        {ROLES_CREAR.includes(usuario.rol) && (
          <Link to="/incidencias/nueva" className="btn btn-primario">
            <Icono nombre="mas" />
            Nueva incidencia
          </Link>
        )}
      </header>

      {eliminada && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-marca-200 bg-marca-50 p-3 text-marca-900">
          <Icono nombre="check" tamano={18} />
          La incidencia <strong className="font-mono">{eliminada}</strong> se eliminó correctamente.
        </p>
      )}

      <form onSubmit={enviarBusqueda} role="search" className="mt-6 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <label htmlFor="buscar" className="sr-only">Buscar incidencias</label>
          <Icono nombre="buscar" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="buscar"
            type="search"
            value={texto}
            onChange={(e) => cambiarTexto(e.target.value)}
            placeholder="Buscar por título, descripción o etiqueta (ej. filtración)"
            className="campo pl-11"
          />
        </div>
        <button type="submit" className="btn btn-primario">
          <Icono nombre="buscar" tamano={18} />
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

      {enBusqueda && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <Icono nombre="buscar" tamano={16} />
          Resultados ordenados por relevancia para <strong className="font-semibold">«{q}»</strong>.
          <button type="button" onClick={() => { setTexto(""); actualizar({ q: "" }); }} className="enlace">
            Quitar búsqueda
          </button>
        </p>
      )}

      <div className="mt-4" aria-live="polite">
        {cargando && <Cargando texto="Cargando incidencias…" />}
        {!cargando && error && <ErrorMensaje error={error} onReintentar={reintentar} />}
        {!cargando && !error && datos.length === 0 && (
          <EstadoVacio
            icono={enBusqueda ? "buscar" : "buzon"}
            titulo={enBusqueda ? "Ninguna incidencia coincide con la búsqueda" : "No hay incidencias con esos filtros"}
            texto={enBusqueda ? "Prueba con otra palabra; la búsqueda ignora acentos y plurales." : "Cambia o limpia los filtros para ver más resultados."}
          >
            {hayFiltros && (
              <button type="button" onClick={() => setParams({})} className="btn btn-secundario">
                Limpiar filtros
              </button>
            )}
          </EstadoVacio>
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
