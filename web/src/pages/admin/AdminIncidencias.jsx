// /admin/incidencias: todas las incidencias con filtros, búsqueda y expediente completo.
// Solo lectura: el historial operativo no se altera desde aquí y nada se borra permanentemente.
import { useState } from "react";
import CabeceraAdmin from "../../components/admin/CabeceraAdmin.jsx";
import Cargando from "../../components/Cargando.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import ErrorMensaje from "../../components/ErrorMensaje.jsx";
import Icono from "../../components/Iconos.jsx";
import Paginacion from "../../components/Paginacion.jsx";
import { useDatosApi } from "../../hooks/useDatosApi.js";
import { CATEGORIAS, EDIFICIOS, ESTADOS, PRIORIDADES } from "../../catalogo.js";

const LIMITE = 10;
const VACIO = { q: "", categoria: "", estado: "", prioridad: "", edificio: "" };

const fecha = (valor) => (valor ? new Date(valor).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—");

function queryDe(f) {
  const p = new URLSearchParams({ pagina: String(f.pagina), limite: String(LIMITE) });
  for (const k of ["q", "categoria", "estado", "prioridad", "edificio"]) if (f[k]) p.set(k, f[k]);
  return p.toString();
}

// Expediente completo: datos, quién la creó y la modificó, historial, evidencias y etiquetas.
function Expediente({ codigo }) {
  const exp = useDatosApi(`/admin/incidencias/${codigo}`);
  if (exp.cargando) return <Cargando texto="Cargando expediente…" />;
  if (exp.error) return <ErrorMensaje error={exp.error} onReintentar={exp.recargar} />;
  const i = exp.datos;
  if (!i) return null;
  const detalle = Object.entries(i.detalle_especifico ?? {});

  return (
    <div className="space-y-5">
      <header>
        <p className="font-mono text-sm text-slate-600">{i.codigo}</p>
        <h2 className="text-lg font-semibold text-slate-900">{i.titulo}</h2>
        <p className="mt-1 text-sm text-slate-700">{i.descripcion}</p>
      </header>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-600">Categoría</dt>
          <dd className="font-medium text-slate-900">{CATEGORIAS[i.categoria] ?? i.categoria}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Estado · Prioridad</dt>
          <dd className="font-medium text-slate-900">
            {ESTADOS[i.estado] ?? i.estado} · {PRIORIDADES[i.prioridad] ?? i.prioridad}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600">Ubicación</dt>
          <dd className="font-medium text-slate-900">
            {i.ubicacion?.edificio} · {i.ubicacion?.espacio}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600">Horas invertidas</dt>
          <dd className="font-medium text-slate-900">{i.horas_invertidas ?? 0}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Asignado a</dt>
          <dd className="font-medium text-slate-900">{i.asignado_a?.nombre ?? "Sin asignar"}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Fecha de resolución</dt>
          <dd className="font-medium text-slate-900">{fecha(i.fecha_resolucion)}</dd>
        </div>
      </dl>

      {detalle.length > 0 && (
        <section aria-labelledby="detalle-tecnico">
          <h3 id="detalle-tecnico" className="font-semibold text-slate-900">Detalle técnico</h3>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {detalle.map(([k, v]) => (
              <div key={k}>
                <dt className="text-slate-600">{k.replaceAll("_", " ")}</dt>
                <dd className="font-medium text-slate-900">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="auditoria">
        <h3 id="auditoria" className="font-semibold text-slate-900">Auditoría</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {i.auditoria?.creado_por && (
            <li>
              Creada por <strong className="text-slate-900">{i.auditoria.creado_por.nombre}</strong> el {fecha(i.auditoria.creado_por.fecha)}
            </li>
          )}
          {i.auditoria?.ultima_modificacion && (
            <li>
              Última modificación por <strong className="text-slate-900">{i.auditoria.ultima_modificacion.autor.nombre}</strong> el{" "}
              {fecha(i.auditoria.ultima_modificacion.fecha)}
            </li>
          )}
        </ul>
      </section>

      <section aria-labelledby="historial">
        <h3 id="historial" className="font-semibold text-slate-900">Historial de seguimiento</h3>
        <ol className="mt-2 space-y-3 border-l-2 border-marca-100 pl-4">
          {(i.historial_seguimiento ?? []).map((h, n) => (
            <li key={n} className="text-sm">
              <p className="font-medium text-slate-900">
                {fecha(h.fecha)} · {h.autor?.nombre} · {ESTADOS[h.estado_nuevo] ?? h.estado_nuevo}
                {h.horas ? ` · ${h.horas} h` : ""}
              </p>
              <p className="text-slate-700">{h.comentario}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="evidencias">
        <h3 id="evidencias" className="font-semibold text-slate-900">Evidencias</h3>
        {(i.evidencias_adjuntas ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Sin evidencias adjuntas.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {i.evidencias_adjuntas.map((ev, n) => (
              <li key={n} className="flex items-center gap-2">
                <Icono nombre="clip" tamano={16} />
                {ev.url_storage ? (
                  <a className="font-medium text-marca-800 underline" href={ev.url_storage} target="_blank" rel="noreferrer">
                    {ev.nombre_archivo}
                  </a>
                ) : (
                  <span className="font-medium text-slate-900">{ev.nombre_archivo}</span>
                )}
                <span className="text-slate-600">· {ev.tipo_mime}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(i.tags ?? []).length > 0 && (
        <section aria-labelledby="etiquetas">
          <h3 id="etiquetas" className="font-semibold text-slate-900">Etiquetas</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {i.tags.map((t) => (
              <li key={t} className="insignia bg-slate-100 text-slate-800">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function AdminIncidencias() {
  const [filtros, setFiltros] = useState({ ...VACIO, pagina: 1 });
  const [borrador, setBorrador] = useState(VACIO);
  const [codigo, setCodigo] = useState(null);
  const lista = useDatosApi(`/admin/incidencias?${queryDe(filtros)}`);

  function buscar(e) {
    e.preventDefault();
    setFiltros({ ...borrador, pagina: 1 });
  }

  return (
    <>
      <CabeceraAdmin titulo="Incidencias" descripcion="Todas las incidencias del campus, con su expediente completo. Solo lectura." />

      <form onSubmit={buscar} role="search" aria-label="Buscar incidencias" className="tarjeta mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6 xl:items-end">
        <label className="block sm:col-span-2 xl:col-span-2">
          <span className="etiqueta-campo">Código, título o descripción</span>
          <input className="campo mt-1.5" value={borrador.q} onChange={(e) => setBorrador({ ...borrador, q: e.target.value })} placeholder="Ej. INC-2026 o filtración" />
        </label>
        <label className="block">
          <span className="etiqueta-campo">Categoría</span>
          <select className="campo mt-1.5" value={borrador.categoria} onChange={(e) => setBorrador({ ...borrador, categoria: e.target.value })}>
            <option value="">Todas</option>
            {Object.entries(CATEGORIAS).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiqueta-campo">Estado</span>
          <select className="campo mt-1.5" value={borrador.estado} onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiqueta-campo">Prioridad</span>
          <select className="campo mt-1.5" value={borrador.prioridad} onChange={(e) => setBorrador({ ...borrador, prioridad: e.target.value })}>
            <option value="">Todas</option>
            {Object.entries(PRIORIDADES).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primario">
            <Icono nombre="buscar" /> Buscar
          </button>
          <button type="button" className="btn btn-secundario" onClick={() => { setBorrador(VACIO); setFiltros({ ...VACIO, pagina: 1 }); }}>
            Limpiar
          </button>
        </div>
        <label className="block sm:col-span-2 xl:col-span-2">
          <span className="etiqueta-campo">Edificio</span>
          <select className="campo mt-1.5" value={borrador.edificio} onChange={(e) => setBorrador({ ...borrador, edificio: e.target.value })}>
            <option value="">Todos</option>
            {EDIFICIOS.map((ed) => (
              <option key={ed} value={ed}>
                {ed}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section aria-labelledby="lista-incidencias" className="tarjeta p-4 sm:p-5">
          <h2 id="lista-incidencias" className="sr-only">Resultados</h2>
          {lista.cargando && <Cargando texto="Buscando incidencias…" />}
          {lista.error && <ErrorMensaje error={lista.error} onReintentar={lista.recargar} />}
          {lista.datos && lista.datos.total === 0 && <EstadoVacio titulo="Sin incidencias" texto="Ninguna incidencia coincide con los filtros." />}
          {lista.datos && lista.datos.total > 0 && (
            <>
              <ul className="divide-y divide-slate-200">
                {lista.datos.datos.map((i) => (
                  <li key={i.codigo}>
                    <button
                      type="button"
                      onClick={() => setCodigo(i.codigo)}
                      aria-pressed={codigo === i.codigo}
                      className={`w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-marca-50 ${codigo === i.codigo ? "bg-marca-50" : ""}`}
                    >
                      <span className="block font-mono text-xs text-slate-600">{i.codigo}</span>
                      <span className="block font-semibold text-slate-900">{i.titulo}</span>
                      <span className="block text-sm text-slate-600">
                        {CATEGORIAS[i.categoria] ?? i.categoria} · {ESTADOS[i.estado] ?? i.estado} · {PRIORIDADES[i.prioridad] ?? i.prioridad} · {i.ubicacion?.edificio}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Paginacion pagina={filtros.pagina} limite={LIMITE} total={lista.datos.total} onCambiar={(p) => setFiltros({ ...filtros, pagina: p })} />
            </>
          )}
        </section>

        <section aria-labelledby="expediente" className="tarjeta p-4 sm:p-5">
          <h2 id="expediente" className="mb-4 text-lg font-semibold text-slate-900">Expediente</h2>
          {codigo ? (
            <Expediente key={codigo} codigo={codigo} />
          ) : (
            <EstadoVacio icono="lista" titulo="Elige una incidencia" texto="Selecciónala de la lista para ver su expediente completo." />
          )}
        </section>
      </div>
    </>
  );
}
