// /admin/catalogos: catálogos del sistema. Solo lectura por ahora: las altas y ediciones
// (POST/PATCH /api/admin/catalogos) quedan pendientes en la API.
import CabeceraAdmin from "../../components/admin/CabeceraAdmin.jsx";
import Cargando from "../../components/Cargando.jsx";
import ErrorMensaje from "../../components/ErrorMensaje.jsx";
import Icono from "../../components/Iconos.jsx";
import { useDatosApi } from "../../hooks/useDatosApi.js";
import { CATEGORIAS, ESTADOS, PRIORIDADES } from "../../catalogo.js";
import { NOMBRE_ROL } from "../../auth/permisos.js";

// Lista de valores con su etiqueta legible (o el valor tal cual si no hay etiqueta).
function Lista({ titulo, valores, etiquetas }) {
  return (
    <section className="tarjeta p-5">
      <h2 className="font-semibold text-slate-900">{titulo}</h2>
      {valores.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Sin elementos.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {valores.map((v) => (
            <li key={v} className="insignia bg-marca-50 text-marca-900">
              {etiquetas?.[v] ?? v}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminCatalogos() {
  const catalogos = useDatosApi("/admin/catalogos");
  const d = catalogos.datos;

  return (
    <>
      <CabeceraAdmin titulo="Catálogos" descripcion="Valores que usa el sistema para clasificar y ubicar las incidencias." />

      <p className="mb-5 flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-sm text-sky-950">
        <Icono nombre="alerta" className="mt-0.5 shrink-0" />
        <span>
          Por ahora los catálogos se muestran en solo lectura. Crear o editar edificios, ubicaciones y tipos de ubicación está pendiente
          porque aún no tienen dónde guardarse en la base de datos.
        </span>
      </p>

      {catalogos.cargando && <Cargando texto="Cargando catálogos…" />}
      {catalogos.error && <ErrorMensaje error={catalogos.error} onReintentar={catalogos.recargar} />}

      {d && (
        <div className="grid gap-4 md:grid-cols-2">
          <Lista titulo="Categorías de incidencia" valores={d.categorias} etiquetas={CATEGORIAS} />
          <Lista titulo="Prioridades" valores={d.prioridades} etiquetas={PRIORIDADES} />
          <Lista titulo="Estados" valores={d.estados} etiquetas={ESTADOS} />
          <Lista titulo="Edificios con incidencias" valores={d.edificios} />
          <section className="tarjeta p-5 md:col-span-2">
            <h2 className="font-semibold text-slate-900">Técnicos</h2>
            {d.tecnicos.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No hay técnicos registrados.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200">
                {d.tecnicos.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="font-medium text-slate-900">{t.nombre}</span>
                    <span className="text-slate-600">
                      {t.correo} · {NOMBRE_ROL[t.rol]} · {t.activo ? "Activo" : "Suspendido"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
