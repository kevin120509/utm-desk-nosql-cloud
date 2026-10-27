// /admin: resumen del módulo administrativo (usuarios, incidencias, sistema y accesos rápidos).
import { Link } from "react-router-dom";
import CabeceraAdmin from "../../components/admin/CabeceraAdmin.jsx";
import Cargando from "../../components/Cargando.jsx";
import ErrorMensaje from "../../components/ErrorMensaje.jsx";
import Icono from "../../components/Iconos.jsx";
import { useDatosApi } from "../../hooks/useDatosApi.js";
import { CATEGORIAS, ESTADOS } from "../../catalogo.js";

const ETIQUETA_SISTEMA = {
  operativa: "Operativa",
  conectada: "Conectada",
  error: "Error",
  configurado: "Configurado",
  no_configurado: "No configurado",
};

// Tarjeta de indicador: etiqueta, valor principal y una nota opcional.
function Indicador({ icono, etiqueta, valor, nota }) {
  return (
    <div className="tarjeta flex items-start gap-3 p-4 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-700">
        <Icono nombre={icono} tamano={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-600 sm:text-sm">{etiqueta}</p>
        <p className="font-display text-2xl font-semibold leading-tight text-slate-900">{valor}</p>
        {nota && <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{nota}</p>}
      </div>
    </div>
  );
}

// Lista de conteos (categorías, edificios…) con el número escrito junto a cada nombre.
function Conteos({ titulo, filas }) {
  return (
    <section className="tarjeta p-5">
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Sin datos todavía.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filas.map((f) => (
            <li key={f.valor} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-700">{f.etiqueta}</span>
              <span className="font-semibold tabular-nums text-slate-900">{f.total}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminInicio() {
  const metricas = useDatosApi("/admin/metricas");
  const sistema = useDatosApi("/admin/sistema");
  const todos = useDatosApi("/admin/usuarios?limite=1");
  const activos = useDatosApi("/admin/usuarios?activo=true&limite=1");
  const suspendidos = useDatosApi("/admin/usuarios?activo=false&limite=1");

  const porEstado = (metricas.datos?.por_estado ?? []).map((f) => ({ ...f, etiqueta: ESTADOS[f.valor] ?? f.valor }));
  const abiertas = porEstado.filter((f) => ["abierta", "en proceso", "en espera"].includes(f.valor)).reduce((s, f) => s + f.total, 0);
  const cerradas = porEstado.filter((f) => ["resuelta", "cerrada"].includes(f.valor)).reduce((s, f) => s + f.total, 0);
  const porCategoria = (metricas.datos?.por_categoria ?? []).map((f) => ({ ...f, etiqueta: CATEGORIAS[f.valor] ?? f.valor }));
  const porEdificio = (metricas.datos?.por_edificio ?? []).map((f) => ({ ...f, etiqueta: f.valor }));

  return (
    <>
      <CabeceraAdmin titulo="Panel de administración" descripcion="Estado general de usuarios, incidencias y del sistema." />

      <section aria-labelledby="usuarios-titulo" className="mb-6">
        <h2 id="usuarios-titulo" className="mb-3 text-lg font-semibold text-slate-900">Usuarios</h2>
        {todos.cargando || activos.cargando || suspendidos.cargando ? (
          <Cargando texto="Contando usuarios…" />
        ) : todos.error ? (
          <ErrorMensaje error={todos.error} onReintentar={todos.recargar} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Indicador icono="usuario" etiqueta="Total de usuarios" valor={todos.datos?.total ?? 0} />
            <Indicador icono="check" etiqueta="Activos" valor={activos.datos?.total ?? 0} />
            <Indicador icono="alerta" etiqueta="Suspendidos" valor={suspendidos.datos?.total ?? 0} />
          </div>
        )}
      </section>

      <section aria-labelledby="incidencias-titulo" className="mb-6">
        <h2 id="incidencias-titulo" className="mb-3 text-lg font-semibold text-slate-900">Incidencias</h2>
        {metricas.cargando ? (
          <Cargando texto="Calculando métricas…" />
        ) : metricas.error ? (
          <ErrorMensaje error={metricas.error} onReintentar={metricas.recargar} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Indicador icono="lista" etiqueta="Abiertas, en proceso o en espera" valor={abiertas} />
              <Indicador icono="check" etiqueta="Resueltas o cerradas" valor={cerradas} />
              {porEstado.map((f) => (
                <Indicador key={f.valor} icono="lista" etiqueta={f.etiqueta} valor={f.total} />
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Conteos titulo="Por categoría" filas={porCategoria} />
              <Conteos titulo="Por edificio" filas={porEdificio} />
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="sistema-titulo" className="mb-6">
        <h2 id="sistema-titulo" className="mb-3 text-lg font-semibold text-slate-900">Estado del sistema</h2>
        {sistema.cargando ? (
          <Cargando texto="Comprobando el sistema…" />
        ) : sistema.error ? (
          <ErrorMensaje error={sistema.error} onReintentar={sistema.recargar} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Indicador icono="red" etiqueta="API" valor={ETIQUETA_SISTEMA[sistema.datos.api?.estado] ?? "—"} />
            <Indicador icono="red" etiqueta="MongoDB" valor={ETIQUETA_SISTEMA[sistema.datos.mongodb?.estado] ?? "—"} />
            <Indicador icono="archivo" etiqueta="Almacenamiento" valor={ETIQUETA_SISTEMA[sistema.datos.almacenamiento?.estado] ?? "—"} />
          </div>
        )}
      </section>

      <section aria-labelledby="accesos-titulo">
        <h2 id="accesos-titulo" className="mb-3 text-lg font-semibold text-slate-900">Accesos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/admin/usuarios" className="tarjeta flex items-center gap-3 p-4 hover:shadow-elevada">
            <Icono nombre="usuario" /> <span className="font-medium">Gestionar usuarios</span>
          </Link>
          <Link to="/admin/roles" className="tarjeta flex items-center gap-3 p-4 hover:shadow-elevada">
            <Icono nombre="etiqueta" /> <span className="font-medium">Roles y permisos</span>
          </Link>
          <Link to="/admin/bitacora" className="tarjeta flex items-center gap-3 p-4 hover:shadow-elevada">
            <Icono nombre="libro" /> <span className="font-medium">Bitácora</span>
          </Link>
        </div>
      </section>
    </>
  );
}
