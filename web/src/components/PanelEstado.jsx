import { useState } from "react";
import { api, ErrorApi } from "../api/cliente.js";
import { useSesion } from "../auth/SesionContext.jsx";
import { ESTADOS } from "../catalogo.js";
import Campo from "./Campo.jsx";
import Icono from "./Iconos.jsx";

// Destinos válidos por estado (espejo de server/src/domain/transiciones.js, plan §5).
// El servidor sigue siendo la autoridad: aquí solo se evita ofrecer opciones inútiles.
const DESTINOS = {
  abierta: ["en proceso", "en espera", "resuelta"],
  "en proceso": ["abierta", "en espera", "resuelta"],
  "en espera": ["abierta", "en proceso", "resuelta"],
  resuelta: ["cerrada"],
  cerrada: [],
};

// Opciones disponibles según estado actual y rol (cerrar es solo del coordinador).
export function destinosPermitidos(estado, rol) {
  return (DESTINOS[estado] || []).filter((d) => d !== "cerrada" || rol === "coordinador");
}

const MAX_COMENTARIO = 500;

// Panel "Actualizar estado" (RF-07). `onActualizado` = recargar() del expediente.
export default function PanelEstado({ codigo, estadoActual, onActualizado }) {
  const { usuario } = useSesion();
  const rol = usuario?.rol;
  const [estadoNuevo, setEstadoNuevo] = useState("");
  const [horas, setHoras] = useState("");
  const [comentario, setComentario] = useState("");
  const [errores, setErrores] = useState({}); // campo -> mensaje
  const [resumen, setResumen] = useState(""); // errores generales (role="alert")
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (rol !== "tecnico" && rol !== "coordinador") return null;

  const opciones = destinosPermitidos(estadoActual, rol);
  // Si el estado cambió por una recarga, la opción elegida puede dejar de ser válida.
  const seleccion = opciones.includes(estadoNuevo) ? estadoNuevo : "";

  // Cerrada = sin acciones; solo se conserva la confirmación del último cambio.
  if (estadoActual === "cerrada" && !confirmacion) return null;

  // Validación del lado cliente (el servidor vuelve a validar).
  function validar() {
    const e = {};
    if (!seleccion) e.estado_nuevo = "Elige el nuevo estado.";
    const h = Number(horas);
    if (horas === "" || Number.isNaN(h)) e.horas = "Indica las horas invertidas (0 si no hubo).";
    else if (h < 0 || h > 24) e.horas = "Las horas deben estar entre 0 y 24.";
    const c = comentario.trim();
    if (c.length < 3) e.comentario = "El comentario debe tener al menos 3 caracteres.";
    else if (c.length > MAX_COMENTARIO) e.comentario = `Máximo ${MAX_COMENTARIO} caracteres.`;
    return e;
  }

  async function enviar(ev) {
    ev.preventDefault();
    if (enviando) return; // evita doble envío
    setConfirmacion("");
    setResumen("");
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setEnviando(true);
    try {
      await api.patch(`/incidencias/${encodeURIComponent(codigo)}/estado`, {
        estado_nuevo: seleccion,
        horas: Number(horas),
        comentario: comentario.trim(),
      });
      setConfirmacion(`Estado actualizado a "${ESTADOS[seleccion] || seleccion}".`);
      setEstadoNuevo("");
      setHoras("");
      setComentario("");
      setErrores({});
      onActualizado(); // la bitácora se refresca sin recargar la página
    } catch (err) {
      if (!(err instanceof ErrorApi)) throw err;
      manejarError(err);
    } finally {
      setEnviando(false);
    }
  }

  function manejarError(err) {
    if (err.status === 409 || err.codigo === "CONFLICTO") {
      // Se conserva lo escrito (comentario/horas); solo se recargan los datos.
      setResumen("Otra persona actualizó esta incidencia. Se recargaron los datos; revisa y vuelve a intentar.");
      onActualizado();
    } else if (err.codigo === "TRANSICION_INVALIDA") {
      setResumen(err.mensaje || "Esa transición de estado no está permitida.");
    } else if (err.status === 400) {
      // `detalles` puede ser objeto campo->mensaje (o arreglo de textos).
      const campos = {};
      const generales = [];
      if (err.detalles && !Array.isArray(err.detalles)) {
        for (const [k, v] of Object.entries(err.detalles)) {
          if (["estado_nuevo", "horas", "comentario"].includes(k)) campos[k] = String(v);
          else generales.push(String(v));
        }
      } else if (Array.isArray(err.detalles)) {
        generales.push(...err.detalles.map((d) => (typeof d === "string" ? d : d.mensaje || "")));
      }
      setErrores(campos);
      setResumen(
        generales.filter(Boolean).join(" ") ||
          (Object.keys(campos).length ? "Revisa los campos marcados." : err.mensaje),
      );
    } else {
      setResumen(err.mensaje || "No se pudo actualizar el estado.");
    }
  }

  return (
    <section aria-labelledby="titulo-panel-estado" className="tarjeta border-marca-300 p-5 ring-4 ring-marca-50">
      <h2 id="titulo-panel-estado" className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-slate-900">
        <span className="grid size-8 place-items-center rounded-lg bg-marca-50 text-marca-700"><Icono nombre="herramienta" tamano={18} /></span>
        Actualizar estado
      </h2>

      {/* Región viva persistente: anuncia la confirmación a lectores de pantalla. */}
      <p
        role="status"
        aria-live="polite"
        className={confirmacion ? "mb-3 rounded bg-emerald-100 p-2 text-sm font-medium text-emerald-900" : "sr-only"}
      >
        {confirmacion}
      </p>

      {estadoActual === "cerrada" ? null : (
        <form onSubmit={enviar} noValidate className="space-y-4">
          {resumen && (
            <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
              {resumen}
            </div>
          )}

          {opciones.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Esta incidencia está resuelta. Solo el coordinador puede cerrarla.
            </p>
          )}

          <Campo id="estado-nuevo" etiqueta="Nuevo estado" requerido error={errores.estado_nuevo}>
            {(p) => (
              <select {...p} value={seleccion} onChange={(e) => setEstadoNuevo(e.target.value)}>
                <option value="">Selecciona…</option>
                {opciones.map((o) => (
                  <option key={o} value={o}>
                    {ESTADOS[o] || o}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo id="estado-horas" etiqueta="Horas invertidas" requerido ayuda="De 0 a 24, en pasos de 0.25." error={errores.horas}>
            {(p) => (
              <input
                {...p}
                type="number"
                inputMode="decimal"
                min="0"
                max="24"
                step="0.25"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
              />
            )}
          </Campo>

          <Campo
            id="estado-comentario"
            etiqueta="Comentario"
            requerido
            ayuda={`${comentario.length}/${MAX_COMENTARIO} caracteres (mínimo 3).`}
            error={errores.comentario}
          >
            {(p) => (
              <textarea
                {...p}
                rows={3}
                maxLength={MAX_COMENTARIO}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            )}
          </Campo>

          <button
            type="submit"
            disabled={enviando || opciones.length === 0}
            className="btn btn-primario"
          >
            <Icono nombre="guardar" tamano={18} />
            {enviando ? "Guardando…" : "Guardar cambio"}
          </button>
        </form>
      )}
    </section>
  );
}
