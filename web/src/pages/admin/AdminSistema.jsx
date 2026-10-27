// /admin/sistema: estado de la API, de MongoDB y del almacenamiento de evidencias. Sin secretos.
import CabeceraAdmin from "../../components/admin/CabeceraAdmin.jsx";
import Cargando from "../../components/Cargando.jsx";
import ErrorMensaje from "../../components/ErrorMensaje.jsx";
import Icono from "../../components/Iconos.jsx";
import { useDatosApi } from "../../hooks/useDatosApi.js";

const fecha = (valor) => (valor ? new Date(valor).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—");

// Texto y color por estado. El color no es el único indicador: el texto va siempre.
const ESTADO = {
  operativa: { texto: "Operativa", clase: "bg-emerald-100 text-emerald-900" },
  conectada: { texto: "Conectada", clase: "bg-emerald-100 text-emerald-900" },
  configurado: { texto: "Configurado", clase: "bg-emerald-100 text-emerald-900" },
  no_configurado: { texto: "No configurado", clase: "bg-amber-100 text-amber-900" },
  error: { texto: "Error", clase: "bg-red-100 text-red-900" },
};

function Tarjeta({ titulo, estado, detalle }) {
  const e = ESTADO[estado] ?? { texto: "Desconocido", clase: "bg-slate-100 text-slate-800" };
  return (
    <div className="tarjeta p-5">
      <p className="text-sm font-medium text-slate-600">{titulo}</p>
      <p className="mt-2">
        <span className={`insignia ${e.clase}`}>{e.texto}</span>
      </p>
      {detalle && <p className="mt-2 text-sm text-slate-600">{detalle}</p>}
    </div>
  );
}

export default function AdminSistema() {
  const sistema = useDatosApi("/admin/sistema");
  const d = sistema.datos;

  return (
    <>
      <CabeceraAdmin titulo="Sistema" descripcion="Salud de la API, la base de datos y el almacenamiento de evidencias. No muestra secretos." />

      {sistema.cargando && !d && <Cargando texto="Comprobando el sistema…" />}
      {sistema.error && <ErrorMensaje error={sistema.error} onReintentar={sistema.recargar} />}

      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Tarjeta titulo="API" estado={d.api.estado} detalle={`Entorno: ${d.api.entorno} · Versión: ${d.api.version}`} />
            <Tarjeta titulo="MongoDB Atlas" estado={d.mongodb.estado} />
            <Tarjeta titulo="Almacenamiento de evidencias" estado={d.almacenamiento.estado} />
          </div>

          <section aria-labelledby="ultimo-error" className="tarjeta mt-5 p-5">
            <h2 id="ultimo-error" className="font-semibold text-slate-900">Último error interno</h2>
            {d.ultimo_error ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-600">Cuándo</dt>
                  <dd className="font-medium text-slate-900">{fecha(d.ultimo_error.fecha)}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Ruta</dt>
                  <dd className="font-mono text-slate-900">{d.ultimo_error.ruta}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Mensaje</dt>
                  <dd className="text-slate-900">{d.ultimo_error.mensaje}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <Icono nombre="check" /> No hay errores internos registrados en esta instancia.
              </p>
            )}
            <p className="mt-3 text-xs text-slate-600">
              El registro vive en la memoria de la instancia que atendió la petición; no es un historial completo.
            </p>
          </section>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">Última comprobación: {fecha(d.comprobado_en)}</p>
            <button type="button" className="btn btn-secundario" onClick={sistema.recargar} disabled={sistema.cargando}>
              Comprobar de nuevo
            </button>
          </div>
        </>
      )}
    </>
  );
}
