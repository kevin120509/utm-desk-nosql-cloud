import { Link, useParams } from "react-router-dom";
import { useIncidencia } from "../hooks/useIncidencia.js";
import { CATEGORIAS } from "../catalogo.js";
import { EtiquetaEstado, EtiquetaPrioridad, BORDE_PRIORIDAD } from "../components/Etiquetas.jsx";
import Cargando from "../components/Cargando.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import DetalleEspecifico from "../components/DetalleEspecifico.jsx";
import Evidencias from "../components/Evidencias.jsx";
import Bitacora from "../components/Bitacora.jsx";
import PanelEstado from "../components/PanelEstado.jsx";
import PanelEtiquetas from "../components/PanelEtiquetas.jsx";
import SubirEvidencia from "../components/SubirEvidencia.jsx";
import Icono from "../components/Iconos.jsx";
import { formatearFecha, formatearHoras } from "../formato.js";

// Sección del expediente: tarjeta con encabezado semántico e icono.
function Seccion({ titulo, icono, children, className = "" }) {
  return (
    <section className={`tarjeta p-5 ${className}`}>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-slate-900">
        {icono && (
          <span className="grid size-8 place-items-center rounded-lg bg-marca-50 text-marca-700">
            <Icono nombre={icono} tamano={18} />
          </span>
        )}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

// Dato con icono para la franja de metadatos del encabezado.
function Dato({ icono, etiqueta, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icono nombre={icono} tamano={18} className="mt-0.5 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</dt>
        <dd className="break-words font-medium text-slate-900">{children}</dd>
      </div>
    </div>
  );
}

const Volver = () => (
  <Link to="/incidencias" className="btn btn-fantasma -ml-3 !min-h-9 !py-1">
    <Icono nombre="atras" tamano={18} />
    Volver a incidencias
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
        <EstadoVacio icono="buscar" titulo="La incidencia no existe o ya fue depurada" texto="Las incidencias resueltas se eliminan solas a los 60 días.">
          <Link to="/incidencias" className="btn btn-primario">Ver todas las incidencias</Link>
        </EstadoVacio>
      );
    } else if (error.status === 403) {
      cuerpo = (
        <EstadoVacio icono="escudo" titulo="No tienes permiso para ver esta incidencia" texto="Solo puedes abrir las incidencias que tú reportaste.">
          <Link to="/incidencias" className="btn btn-primario">Ir a mis incidencias</Link>
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
  const lugar = [
    inc.ubicacion?.edificio,
    inc.ubicacion?.piso !== undefined ? `piso ${inc.ubicacion.piso}` : null,
    inc.ubicacion?.espacio,
  ].filter(Boolean).join(" · ");

  return (
    <article>
      <nav aria-label="Migas de pan"><Volver /></nav>

      <header className={`tarjeta mt-2 border-l-8 p-5 sm:p-6 ${BORDE_PRIORIDAD[inc.prioridad] || "border-l-slate-200"}`}>
        <p className="font-mono text-sm font-medium tracking-wide text-slate-500">{inc.codigo}</p>
        <h1 className="mt-1 break-words text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{inc.titulo}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-2">
          <EtiquetaEstado estado={inc.estado} />
          <EtiquetaPrioridad prioridad={inc.prioridad} />
          <span className="insignia border-slate-300 bg-white text-slate-700">{CATEGORIAS[inc.categoria] || inc.categoria}</span>
        </p>
        <dl className="mt-5 grid gap-x-8 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <Dato icono="lugar" etiqueta="Ubicación">{lugar}</Dato>
          <Dato icono="calendario" etiqueta="Creada">{formatearFecha(inc.fecha_creacion)}</Dato>
          <Dato icono="reloj" etiqueta="Actualizada">{formatearFecha(inc.fecha_actualizacion)}</Dato>
          {inc.fecha_resolucion ? (
            <Dato icono="check" etiqueta="Resuelta">{formatearFecha(inc.fecha_resolucion)}</Dato>
          ) : (
            <Dato icono="usuario" etiqueta="Asignado a">{inc.asignado_a?.nombre || "Sin asignar"}</Dato>
          )}
        </dl>
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Columna principal: el problema, sus datos, evidencias y la historia */}
        <div className="space-y-6">
          <Seccion titulo="Descripción" icono="archivo">
            <p className="whitespace-pre-line break-words leading-relaxed text-slate-800">{inc.descripcion}</p>
          </Seccion>

          {inc.detalle_especifico && Object.keys(inc.detalle_especifico).length > 0 && (
            <Seccion titulo="Detalle técnico" icono="herramienta">
              <DetalleEspecifico categoria={inc.categoria} detalle={inc.detalle_especifico} />
            </Seccion>
          )}

          <Seccion titulo={`Evidencias${tieneEvidencias ? ` (${inc.evidencias_adjuntas.length})` : ""}`} icono="clip">
            {tieneEvidencias ? (
              <Evidencias evidencias={inc.evidencias_adjuntas} />
            ) : (
              <p className="text-slate-600">Esta incidencia todavía no tiene fotos ni documentos adjuntos.</p>
            )}
            <SubirEvidencia codigo={inc.codigo} reportante={inc.reportante} onSubida={recargar} />
          </Seccion>

          <Seccion titulo="Bitácora de seguimiento" icono="reloj">
            {tieneHistorial ? (
              <Bitacora historial={inc.historial_seguimiento} />
            ) : (
              <p className="text-slate-600">Aún no hay movimientos registrados.</p>
            )}
          </Seccion>
        </div>

        {/* Columna lateral: acciones y datos de contexto */}
        <aside className="space-y-6 lg:sticky lg:top-6" aria-label="Acciones y contexto">
          {/* F06: panel "Actualizar estado" (solo técnico/coordinador; se oculta solo si no aplica). */}
          <div id="panel-acciones-personal">
            <PanelEstado codigo={inc.codigo} estadoActual={inc.estado} onActualizado={recargar} />
          </div>

          <Seccion titulo="Reportante" icono="usuario">
            <p className="break-words font-semibold text-slate-900">{inc.reportante?.nombre}</p>
            {inc.reportante?.tipo && <p className="text-sm capitalize text-slate-600">{inc.reportante.tipo}</p>}
            {inc.reportante?.correo && <p className="mt-1 break-all text-sm text-slate-700">{inc.reportante.correo}</p>}
          </Seccion>

          {typeof inc.horas_invertidas === "number" && (
            <Seccion titulo="Tiempo invertido" icono="reloj">
              <p className="font-display text-3xl font-semibold text-marca-800">{formatearHoras(inc.horas_invertidas)}</p>
              <p className="text-sm text-slate-600">de trabajo acumulado</p>
            </Seccion>
          )}

          {/* F06: lista de etiquetas; el personal puede agregar/quitar. */}
          <PanelEtiquetas codigo={inc.codigo} tags={inc.tags || []} />
        </aside>
      </div>
    </article>
  );
}
