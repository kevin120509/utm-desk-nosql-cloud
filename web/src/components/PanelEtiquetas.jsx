import { useEffect, useState } from "react";
import { api, ErrorApi } from "../api/cliente.js";
import { useSesion } from "../auth/SesionContext.jsx";
import Campo from "./Campo.jsx";

const MIN = 2;
const MAX = 40;

// Etiquetas (RF-08). Todos las ven; solo técnico/coordinador agregan o quitan.
// `tags` viene del expediente; la lista local se actualiza con el `{ tags }` de la API.
export default function PanelEtiquetas({ codigo, tags: inicial = [] }) {
  const { usuario } = useSesion();
  const puedeEditar = usuario?.rol === "tecnico" || usuario?.rol === "coordinador";
  const [tags, setTags] = useState(inicial);
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  // Si el expediente se recarga, se sincroniza la lista.
  useEffect(() => {
    setTags(inicial);
  }, [inicial]);

  const base = `/incidencias/${encodeURIComponent(codigo)}/tags`;

  async function ejecutar(accion, mensajeOk) {
    if (ocupado) return false;
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      const resp = await accion();
      if (Array.isArray(resp?.tags)) setTags(resp.tags);
      setAviso(mensajeOk);
      return true;
    } catch (e) {
      if (!(e instanceof ErrorApi)) throw e;
      const det = e.detalles && !Array.isArray(e.detalles) ? Object.values(e.detalles)[0] : null;
      setError(det ? String(det) : e.mensaje);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function agregar(ev) {
    ev.preventDefault();
    // Normaliza: minúsculas, sin espacios sobrantes (y espacios internos colapsados).
    const tag = nuevo.trim().replace(/\s+/g, " ").toLowerCase();
    if (tag.length < MIN || tag.length > MAX) {
      setError(`La etiqueta debe tener entre ${MIN} y ${MAX} caracteres.`);
      return;
    }
    const ok = await ejecutar(() => api.post(base, { tag }), `Etiqueta "${tag}" agregada.`);
    if (ok) setNuevo("");
  }

  function quitar(tag) {
    // Confirmación ligera con el diálogo nativo del navegador.
    if (!window.confirm(`¿Quitar la etiqueta "${tag}"?`)) return;
    ejecutar(() => api.delete(`${base}/${encodeURIComponent(tag)}`), `Etiqueta "${tag}" eliminada.`);
  }

  if (!puedeEditar && tags.length === 0) return null;

  return (
    <section className="rounded-md border border-slate-300 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Etiquetas</h2>

      {tags.length === 0 ? (
        <p className="text-slate-700">Sin etiquetas.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-900">
              <span className="break-all">{t}</span>
              {puedeEditar && (
                <button
                  type="button"
                  onClick={() => quitar(t)}
                  disabled={ocupado}
                  aria-label={`Quitar etiqueta ${t}`}
                  className="rounded-full px-2 text-base font-bold leading-6 text-slate-800 hover:bg-slate-300 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700"
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeEditar && (
        <form onSubmit={agregar} noValidate className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 basis-48">
            <Campo id="tag-nuevo" etiqueta="Agregar etiqueta" requerido ayuda={`${MIN} a ${MAX} caracteres; se guarda en minúsculas.`}>
              {(p) => <input {...p} type="text" maxLength={MAX} value={nuevo} onChange={(e) => setNuevo(e.target.value)} />}
            </Campo>
          </div>
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-md bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            {ocupado ? "Guardando…" : "Agregar"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      <p role="status" aria-live="polite" className={aviso ? "mt-2 text-sm text-emerald-900" : "sr-only"}>
        {aviso}
      </p>
    </section>
  );
}
