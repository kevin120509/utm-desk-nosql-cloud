// /admin/bitacora: registro de las acciones administrativas (solo lectura).
import { useState } from "react";
import CabeceraAdmin from "../../components/admin/CabeceraAdmin.jsx";
import Cargando from "../../components/Cargando.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import ErrorMensaje from "../../components/ErrorMensaje.jsx";
import Paginacion from "../../components/Paginacion.jsx";
import { useDatosApi } from "../../hooks/useDatosApi.js";

const LIMITE = 15;
const MODULOS = ["usuarios", "catalogos", "incidencias"];

const fecha = (valor) => new Date(valor).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" });

export default function AdminBitacora() {
  const [filtros, setFiltros] = useState({ modulo: "", resultado: "", pagina: 1 });
  const p = new URLSearchParams({ pagina: String(filtros.pagina), limite: String(LIMITE) });
  if (filtros.modulo) p.set("modulo", filtros.modulo);
  if (filtros.resultado) p.set("resultado", filtros.resultado);
  const bitacora = useDatosApi(`/admin/bitacora?${p}`);
  const d = bitacora.datos;

  return (
    <>
      <CabeceraAdmin titulo="Bitácora administrativa" descripcion="Quién hizo qué, sobre qué registro y con qué resultado. Solo lectura." />

      <div className="tarjeta mb-5 grid gap-3 p-4 sm:grid-cols-2 sm:items-end">
        <label className="block">
          <span className="etiqueta-campo">Módulo</span>
          <select className="campo mt-1.5" value={filtros.modulo} onChange={(e) => setFiltros({ ...filtros, modulo: e.target.value, pagina: 1 })}>
            <option value="">Todos</option>
            {MODULOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiqueta-campo">Resultado</span>
          <select className="campo mt-1.5" value={filtros.resultado} onChange={(e) => setFiltros({ ...filtros, resultado: e.target.value, pagina: 1 })}>
            <option value="">Todos</option>
            <option value="exito">Éxito</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </label>
      </div>

      {bitacora.cargando && <Cargando texto="Cargando bitácora…" />}
      {bitacora.error && <ErrorMensaje error={bitacora.error} onReintentar={bitacora.recargar} />}
      {d && d.total === 0 && <EstadoVacio titulo="Sin registros" texto="Todavía no hay acciones administrativas con estos filtros." />}

      {d && d.total > 0 && (
        <>
          <div className="tarjeta overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Acciones administrativas registradas</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Fecha</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Usuario</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Acción</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Módulo</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Registro</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Resultado</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {d.datos.map((r) => (
                  <tr key={r._id}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{fecha(r.fecha)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{r.usuario_nombre}</td>
                    <td className="px-3 py-2.5 text-slate-800">
                      {r.accion}
                      {r.cambios && <span className="block font-mono text-xs text-slate-600">{JSON.stringify(r.cambios)}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{r.modulo}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.registro_id}</td>
                    <td className="px-3 py-2.5">
                      {r.resultado === "exito" ? (
                        <span className="insignia bg-emerald-100 text-emerald-900">Éxito</span>
                      ) : (
                        <span className="insignia bg-red-100 text-red-900">Rechazado{r.codigo_error ? ` · ${r.codigo_error}` : ""}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{r.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion
            unidad={["registro", "registros"]}
            pagina={filtros.pagina}
            limite={LIMITE}
            total={d.total}
            onCambiar={(pag) => setFiltros({ ...filtros, pagina: pag })}
          />
        </>
      )}
    </>
  );
}
