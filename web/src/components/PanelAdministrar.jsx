import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ErrorApi } from "../api/cliente.js";
import { useSesion } from "../auth/SesionContext.jsx";
import { EDIFICIOS, PRIORIDADES } from "../catalogo.js";
import Campo from "./Campo.jsx";
import Icono from "./Iconos.jsx";

const MAX_DESC = 2000;

// Panel "Administrar" (RF-12): solo coordinador. Editar campos universales (PATCH) y eliminar (DELETE).
// El servidor sigue siendo la autoridad: aquí solo se evita mostrar acciones que no corresponden.
export default function PanelAdministrar({ incidencia, onActualizado }) {
  const { usuario } = useSesion();
  const navigate = useNavigate();
  const [modo, setModo] = useState(null); // null | "editar" | "eliminar"
  const [f, setF] = useState(null);
  const [errores, setErrores] = useState({});
  const [resumen, setResumen] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  if (usuario?.rol !== "coordinador") return null;

  function abrirEditar() {
    setAviso("");
    setErrores({});
    setResumen("");
    setF({
      titulo: incidencia.titulo ?? "",
      descripcion: incidencia.descripcion ?? "",
      prioridad: incidencia.prioridad ?? "",
      edificio: incidencia.ubicacion?.edificio ?? "",
      piso: incidencia.ubicacion?.piso === undefined ? "" : String(incidencia.ubicacion.piso),
      espacio: incidencia.ubicacion?.espacio ?? "",
    });
    setModo("editar");
  }

  const set = (campo) => (e) => setF((v) => ({ ...v, [campo]: e.target.value }));

  // Solo se envía lo que cambió (el servidor exige al menos un campo y rechaza campos extra).
  function cambios() {
    const c = {};
    if (f.titulo.trim() !== incidencia.titulo) c.titulo = f.titulo.trim();
    if (f.descripcion.trim() !== incidencia.descripcion) c.descripcion = f.descripcion.trim();
    if (f.prioridad !== incidencia.prioridad) c.prioridad = f.prioridad;
    const u = incidencia.ubicacion ?? {};
    const pisoOriginal = u.piso === undefined ? "" : String(u.piso);
    if (f.edificio !== u.edificio || f.espacio.trim() !== u.espacio || f.piso.trim() !== pisoOriginal) {
      // La ubicación se manda COMPLETA (edificio + espacio, piso solo si hay).
      c.ubicacion = { edificio: f.edificio, espacio: f.espacio.trim() };
      if (f.piso.trim() !== "") c.ubicacion.piso = Number(f.piso);
    }
    return c;
  }

  async function guardar(ev) {
    ev.preventDefault();
    if (ocupado) return;
    setResumen("");
    setErrores({});
    const c = cambios();
    if (Object.keys(c).length === 0) {
      setResumen("No hay cambios que guardar.");
      return;
    }
    if (c.ubicacion?.piso !== undefined && !Number.isInteger(c.ubicacion.piso)) {
      setErrores({ piso: "El piso debe ser un número entero." });
      return;
    }
    setOcupado(true);
    try {
      await api.patch(`/incidencias/${encodeURIComponent(incidencia.codigo)}`, c);
      setModo(null);
      setAviso("Datos actualizados.");
      onActualizado();
    } catch (err) {
      if (!(err instanceof ErrorApi)) throw err;
      if (err.status === 400 && err.detalles && !Array.isArray(err.detalles)) {
        const porCampo = {};
        const otros = [];
        for (const [k, v] of Object.entries(err.detalles)) {
          const campo = k.startsWith("ubicacion.") ? k.slice("ubicacion.".length) : k;
          if (["titulo", "descripcion", "prioridad", "edificio", "piso", "espacio"].includes(campo)) porCampo[campo] = String(v);
          else otros.push(String(v));
        }
        setErrores(porCampo);
        setResumen(otros.join(" ") || "Revisa los campos marcados.");
      } else {
        setResumen(err.mensaje || "No se pudieron guardar los cambios.");
      }
    } finally {
      setOcupado(false);
    }
  }

  async function eliminar() {
    if (ocupado) return;
    setOcupado(true);
    setResumen("");
    try {
      await api.delete(`/incidencias/${encodeURIComponent(incidencia.codigo)}`);
      navigate("/incidencias", { replace: true, state: { eliminada: incidencia.codigo } });
    } catch (err) {
      if (!(err instanceof ErrorApi)) throw err;
      // 404: ya no existe (otra persona la borró o la depuró el TTL): se vuelve a la lista igual.
      if (err.status === 404) navigate("/incidencias", { replace: true });
      else setResumen(err.mensaje || "No se pudo eliminar la incidencia.");
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="titulo-panel-admin" className="tarjeta p-5">
      <h2 id="titulo-panel-admin" className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-slate-900">
        <span className="grid size-8 place-items-center rounded-lg bg-marca-50 text-marca-700">
          <Icono nombre="escudo" tamano={18} />
        </span>
        Administrar
      </h2>

      <p role="status" aria-live="polite" className={aviso ? "mb-3 rounded-lg bg-marca-50 p-2.5 text-sm font-medium text-marca-900" : "sr-only"}>
        {aviso}
      </p>

      {modo === null && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={abrirEditar} className="btn btn-secundario flex-1">
            <Icono nombre="editar" tamano={18} />
            Editar datos
          </button>
          <button type="button" onClick={() => { setAviso(""); setResumen(""); setModo("eliminar"); }} className="btn btn-peligro flex-1">
            <Icono nombre="papelera" tamano={18} />
            Eliminar
          </button>
        </div>
      )}

      {modo === "editar" && f && (
        <form onSubmit={guardar} noValidate className="space-y-4">
          {resumen && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">
              {resumen}
            </div>
          )}
          <Campo id="admin-titulo" etiqueta="Título" requerido error={errores.titulo} ayuda="Entre 5 y 120 caracteres">
            {(p) => <input {...p} type="text" maxLength={120} value={f.titulo} onChange={set("titulo")} />}
          </Campo>
          <Campo id="admin-descripcion" etiqueta="Descripción" requerido error={errores.descripcion} ayuda={`${f.descripcion.length} / ${MAX_DESC} caracteres`}>
            {(p) => <textarea {...p} rows={4} maxLength={MAX_DESC} value={f.descripcion} onChange={set("descripcion")} />}
          </Campo>
          <Campo id="admin-prioridad" etiqueta="Prioridad" requerido error={errores.prioridad}>
            {(p) => (
              <select {...p} value={f.prioridad} onChange={set("prioridad")}>
                {Object.entries(PRIORIDADES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            )}
          </Campo>
          <Campo id="admin-edificio" etiqueta="Edificio" requerido error={errores.edificio}>
            {(p) => (
              <select {...p} value={f.edificio} onChange={set("edificio")}>
                {EDIFICIOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="admin-piso" etiqueta="Piso" error={errores.piso}>
              {(p) => <input {...p} type="number" inputMode="numeric" step={1} value={f.piso} onChange={set("piso")} />}
            </Campo>
            <Campo id="admin-espacio" etiqueta="Espacio" requerido error={errores.espacio}>
              {(p) => <input {...p} type="text" value={f.espacio} onChange={set("espacio")} />}
            </Campo>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado} className="btn btn-primario flex-1">
              {ocupado ? "Guardando…" : "Guardar cambios"}
            </button>
            <button type="button" onClick={() => setModo(null)} disabled={ocupado} className="btn btn-secundario">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {modo === "eliminar" && (
        <div role="alertdialog" aria-labelledby="titulo-eliminar" aria-describedby="texto-eliminar" className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p id="titulo-eliminar" className="font-semibold text-red-900">¿Eliminar {incidencia.codigo}?</p>
          <p id="texto-eliminar" className="mt-1 text-sm text-red-900">
            Se borra la incidencia con su bitácora, etiquetas y archivos adjuntos. Esta acción no se puede deshacer.
          </p>
          {resumen && <p role="alert" className="mt-2 text-sm font-medium text-red-900">{resumen}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={eliminar} disabled={ocupado} className="btn flex-1 bg-red-700 text-white hover:bg-red-800">
              {ocupado ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button type="button" onClick={() => setModo(null)} disabled={ocupado} className="btn btn-secundario">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
