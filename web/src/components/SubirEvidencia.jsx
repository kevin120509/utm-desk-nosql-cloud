import { useEffect, useRef, useState } from "react";
import { api, ErrorApi } from "../api/cliente.js";
import { useSesion } from "../auth/SesionContext.jsx";
import { formatearPeso } from "../formato.js";

const TIPOS = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

// Id del dueño: el backend puede devolverlo como string o como { $oid }.
function idDueno(reportante) {
  const u = reportante?.usuario_id;
  return u && typeof u === "object" ? u.$oid || String(u) : u;
}

// Subida de evidencia (RF-04). Visible para técnico/coordinador y para el
// reportante dueño (se compara el id de sesión con reportante.usuario_id).
export default function SubirEvidencia({ codigo, reportante, onSubida }) {
  const { usuario } = useSesion();
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState(null); // URL local para imágenes
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const entrada = useRef(null);

  // Libera la URL de la vista previa al cambiarla o desmontar.
  useEffect(() => () => vista && URL.revokeObjectURL(vista), [vista]);

  const esStaff = usuario?.rol === "tecnico" || usuario?.rol === "coordinador";
  const esDueno =
    usuario?.rol === "reportante" && usuario?.id && String(idDueno(reportante)) === String(usuario.id);
  if (!esStaff && !esDueno) return null;

  function validar(f) {
    if (!TIPOS.includes(f.type)) return "Formato no permitido. Usa JPEG, PNG o PDF.";
    if (f.size === 0) return "El archivo está vacío.";
    if (f.size > MAX_BYTES) return `El archivo pesa ${formatearPeso(f.size / 1024)} y el máximo es 4 MB.`;
    return "";
  }

  function elegir(ev) {
    const f = ev.target.files?.[0] || null;
    setAviso("");
    setVista(null);
    if (!f) {
      setArchivo(null);
      setError("");
      return;
    }
    const problema = validar(f);
    setError(problema);
    setArchivo(problema ? null : f);
    if (!problema && f.type.startsWith("image/")) setVista(URL.createObjectURL(f));
  }

  async function subir(ev) {
    ev.preventDefault();
    if (subiendo || !archivo) return;
    setSubiendo(true);
    setError("");
    setAviso("");
    try {
      const datos = new FormData();
      datos.append("archivo", archivo);
      await api.post(`/incidencias/${encodeURIComponent(codigo)}/evidencias`, datos);
      setAviso(`"${archivo.name}" se subió correctamente.`);
      setArchivo(null);
      setVista(null);
      if (entrada.current) entrada.current.value = "";
      onSubida();
    } catch (e) {
      if (!(e instanceof ErrorApi)) throw e;
      setError(e.mensaje || "No se pudo subir el archivo.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <form onSubmit={subir} noValidate className="mt-4 rounded-md border border-dashed border-slate-400 p-3">
      <label htmlFor="evidencia-archivo" className="block text-sm font-medium text-slate-800">
        Agregar evidencia
      </label>
      <input
        ref={entrada}
        id="evidencia-archivo"
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={elegir}
        disabled={subiendo}
        aria-describedby="evidencia-ayuda evidencia-error"
        aria-invalid={error ? true : undefined}
        className="mt-1 block w-full text-sm text-slate-900 file:mr-3 file:rounded-md file:border file:border-slate-400 file:bg-white file:px-3 file:py-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700"
      />
      <p id="evidencia-ayuda" className="mt-1 text-xs text-slate-600">
        JPEG, PNG o PDF, hasta 4 MB.
      </p>
      <p
        id="evidencia-error"
        role={error ? "alert" : undefined}
        className={error ? "mt-1 text-sm font-medium text-red-800" : "sr-only"}
      >
        {error}
      </p>

      {vista && (
        <img
          src={vista}
          alt={`Vista previa de ${archivo?.name}`}
          className="mt-2 max-h-48 w-auto max-w-full rounded border border-slate-200"
        />
      )}
      {archivo && !vista && <p className="mt-2 break-all text-sm text-slate-800">Archivo listo: {archivo.name}</p>}

      <button
        type="submit"
        disabled={!archivo || subiendo}
        className="mt-3 rounded-md bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        {subiendo ? "Subiendo…" : "Subir evidencia"}
      </button>
      <p role="status" aria-live="polite" className={aviso ? "mt-2 text-sm text-emerald-900" : "sr-only"}>
        {aviso}
      </p>
    </form>
  );
}
