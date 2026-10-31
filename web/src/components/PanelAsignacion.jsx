import { useEffect, useState } from "react";
import { api } from "../api/cliente.js";
import { useSesion } from "../auth/SesionContext.jsx";
import ErrorMensaje from "./ErrorMensaje.jsx";
import Icono from "./Iconos.jsx";

// La asignación es una acción exclusiva del coordinador.
export default function PanelAsignacion({ codigo, categoria, asignado, onAsignado }) {
  const { usuario } = useSesion();
  const [tecnicos, setTecnicos] = useState([]);
  const [tecnicoId, setTecnicoId] = useState(asignado?.usuario_id ? String(asignado.usuario_id) : "");
  const [comentario, setComentario] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [confirmacion, setConfirmacion] = useState("");

  useEffect(() => {
    if (usuario?.rol !== "coordinador") return undefined;
    let activo = true;
    setCargando(true);
    api
      .get(`/incidencias/tecnicos/disponibles?categoria=${encodeURIComponent(categoria)}`)
      .then(({ datos }) => activo && setTecnicos(datos ?? []))
      .catch((e) => activo && setError(e))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [categoria, usuario?.rol]);

  if (usuario?.rol !== "coordinador") return null;

  async function enviar(evento) {
    evento.preventDefault();
    if (!tecnicoId || enviando) return;
    setError(null);
    setConfirmacion("");
    setEnviando(true);
    try {
      await api.patch(`/incidencias/${encodeURIComponent(codigo)}/asignacion`, {
        tecnico_id: tecnicoId,
        ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
      });
      const tecnico = tecnicos.find((t) => t.id === tecnicoId);
      setConfirmacion(`Incidencia asignada a ${tecnico?.nombre || "el técnico seleccionado"}.`);
      setComentario("");
      onAsignado();
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-panel-asignacion" className="tarjeta border-marca-300 p-5 ring-4 ring-marca-50">
      <h2 id="titulo-panel-asignacion" className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-slate-900">
        <span className="grid size-8 place-items-center rounded-lg bg-marca-50 text-marca-700"><Icono nombre="usuario" tamano={18} /></span>
        Asignar técnico
      </h2>
      {error && <ErrorMensaje error={error} />}
      <p role="status" aria-live="polite" className={confirmacion ? "mb-3 rounded bg-emerald-100 p-2 text-sm font-medium text-emerald-900" : "sr-only"}>{confirmacion}</p>
      <form onSubmit={enviar} className="space-y-4">
        <label htmlFor="tecnico-asignado" className="etiqueta-campo">Técnico disponible</label>
        <select id="tecnico-asignado" className="campo" value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} disabled={cargando || enviando}>
          <option value="">{cargando ? "Cargando técnicos…" : "Selecciona un técnico…"}</option>
          {tecnicos.map((tecnico) => <option key={tecnico.id} value={tecnico.id}>{tecnico.nombre}</option>)}
        </select>
        {!cargando && tecnicos.length === 0 && <p className="text-sm text-slate-600">No hay técnicos disponibles para esta categoría.</p>}
        <label htmlFor="comentario-asignacion" className="etiqueta-campo">Comentario (opcional)</label>
        <textarea id="comentario-asignacion" className="campo" rows={2} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Indicación para el técnico" disabled={enviando} />
        <button type="submit" disabled={!tecnicoId || enviando || cargando} className="btn btn-primario">
          <Icono nombre="guardar" tamano={18} />
          {enviando ? "Asignando…" : asignado ? "Reasignar técnico" : "Asignar técnico"}
        </button>
      </form>
    </section>
  );
}
