import { Link, useParams } from "react-router-dom";
import { useIncidencia } from "../hooks/useIncidencia.js";
import { CATEGORIAS } from "../catalogo.js";
import { EtiquetaEstado, EtiquetaPrioridad } from "../components/Etiquetas.jsx";
import Cargando from "../components/Cargando.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import DetalleEspecifico from "../components/DetalleEspecifico.jsx";
import Evidencias from "../components/Evidencias.jsx";
import Bitacora from "../components/Bitacora.jsx";
import { formatearFecha, formatearHoras } from "../formato.js";

const enlaceVolver =
  "inline-block rounded text-emerald-800 underline hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

// Sección con encabezado semántico.
function Seccion({ titulo, children }) {
  return (
    <section className="rounded-md border border-slate-300 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{titulo}</h2>
      {children}
    </section>
  );
}

const Volver = () => (
  <Link to="/incidencias" className={enlaceVolver}>
    ← Volver a incidencias
  </Link>
);

export default function Detalle() {
  const { codigo } = useParams();
  // `recargar` queda disponible para el panel de acciones del personal (F06).
  const { cargando, error, incidencia: inc, recargar } = useIncidencia(codigo);

  if (cargando) return <Cargando texto="Cargando expediente…" />;

  if (error) {
    let cuerpo;
    if (error.status === 404) {
      cuerpo = (
        <EstadoVacio titulo="La incidencia no existe o ya fue depurada">
          <Volver />
        </EstadoVacio>
      );
    } else if (error.status === 403) {
      cuerpo = (
        <EstadoVacio titulo="No tienes permiso para ver esta incidencia">
          <Volver />
        </EstadoVacio>
      );
    } else {
      // Error de red u otro: se permite reintentar.
      cuerpo = (
        <>
          <ErrorMensaje error={error} onReintentar={recargar} />
          <p className="mt-4"><Volver /></p>
        </>
      );
    }
    return <section aria-label="Expediente">{cuerpo}</section>;
  }

  if (!inc) return null;

  const tieneEvidencias = inc.evidencias_adjuntas?.length > 0;
  const tieneHistorial = inc.historial_seguimiento?.length > 0;

  return (
    <article className="space-y-4">
      <p><Volver /></p>

      <header className="rounded-md border border-slate-300 bg-white p-4">
        <p className="text-sm font-medium text-slate-600">{inc.codigo}</p>
        <h1 className="break-words text-2xl font-bold text-emerald-800">{inc.titulo}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <EtiquetaEstado estado={inc.estado} />
          <EtiquetaPrioridad prioridad={inc.prioridad} />
          <span className="text-sm text-slate-700">{CATEGORIAS[inc.categoria] || inc.categoria}</span>
        </p>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div><dt className="inline text-slate-600">Creada: </dt><dd className="inline">{formatearFecha(inc.fecha_creacion)}</dd></div>
          <div><dt className="inline text-slate-600">Actualizada: </dt><dd className="inline">{formatearFecha(inc.fecha_actualizacion)}</dd></div>
          {inc.fecha_resolucion && (
            <div><dt className="inline text-slate-600">Resuelta: </dt><dd className="inline">{formatearFecha(inc.fecha_resolucion)}</dd></div>
          )}
          {inc.asignado_a?.nombre && (
            <div><dt className="inline text-slate-600">Asignado a: </dt><dd className="inline">{inc.asignado_a.nombre}</dd></div>
          )}
        </dl>
      </header>

      {/* F06: aquí va el panel "Actualizar estado" del personal (técnico+).
          Debe llamar a `recargar()` tras un cambio exitoso para refrescar el expediente. */}
      <div id="panel-acciones-personal" />

      <Seccion titulo="Descripción">
        <p className="whitespace-pre-line break-words text-slate-900">{inc.descripcion}</p>
      </Seccion>

      <div className="grid gap-4 md:grid-cols-2">
        <Seccion titulo="Ubicación">
          <p className="text-slate-900">
            {inc.ubicacion?.edificio}
            {inc.ubicacion?.piso !== undefined && `, piso ${inc.ubicacion.piso}`}
            {inc.ubicacion?.espacio && ` · ${inc.ubicacion.espacio}`}
          </p>
        </Seccion>
        <Seccion titulo="Reportante">
          <p className="break-words text-slate-900">
            {inc.reportante?.nombre}
            {inc.reportante?.tipo && <span className="text-slate-600"> ({inc.reportante.tipo})</span>}
          </p>
          {inc.reportante?.correo && <p className="break-all text-sm text-slate-700">{inc.reportante.correo}</p>}
        </Seccion>
      </div>

      {inc.detalle_especifico && Object.keys(inc.detalle_especifico).length > 0 && (
        <Seccion titulo="Detalle específico">
          <DetalleEspecifico categoria={inc.categoria} detalle={inc.detalle_especifico} />
        </Seccion>
      )}

      {inc.tags?.length > 0 && (
        <Seccion titulo="Etiquetas">
          <ul className="flex flex-wrap gap-2">
            {inc.tags.map((t) => (
              <li key={t} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-900">{t}</li>
            ))}
          </ul>
        </Seccion>
      )}

      {typeof inc.horas_invertidas === "number" && (
        <Seccion titulo="Horas invertidas">
          <p className="text-slate-900">{formatearHoras(inc.horas_invertidas)}</p>
        </Seccion>
      )}

      <Seccion titulo="Evidencias">
        {tieneEvidencias ? (
          <Evidencias evidencias={inc.evidencias_adjuntas} />
        ) : (
          <p className="text-slate-700">Esta incidencia no tiene evidencias adjuntas.</p>
        )}
      </Seccion>

      <Seccion titulo="Bitácora de seguimiento">
        {tieneHistorial ? (
          <Bitacora historial={inc.historial_seguimiento} />
        ) : (
          <p className="text-slate-700">Aún no hay movimientos registrados.</p>
        )}
      </Seccion>
    </article>
  );
}
