// Pantalla "Nueva incidencia" (plan §10): campos universales + bloque por categoría.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ErrorApi } from "../api/cliente.js";
import { CATEGORIAS, PRIORIDADES, EDIFICIOS } from "../catalogo.js";
import Campo from "../components/Campo.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import BloqueDetalle, { detalleInicial, validarDetalle, construirDetalle } from "../components/BloqueDetalle.jsx";

const MAX_DESC = 2000;
const INICIAL = { titulo: "", descripcion: "", categoria: "", prioridad: "", edificio: "", piso: "", espacio: "" };

// Ruta del cuerpo -> id del control en el DOM.
const idDe = (ruta) =>
  ruta.startsWith("detalle_especifico.") ? `detalle-${ruta.split(".")[1]}` : ruta.replace(".", "-");

// Valida los campos universales. Claves = rutas del cuerpo (igual que los detalles del 400).
function validarUniversales(f) {
  const e = {};
  const titulo = f.titulo.trim();
  const desc = f.descripcion.trim();
  if (titulo.length < 5 || titulo.length > 120) e.titulo = "El título debe tener entre 5 y 120 caracteres.";
  if (desc.length < 10 || desc.length > MAX_DESC) e.descripcion = `La descripción debe tener entre 10 y ${MAX_DESC} caracteres.`;
  if (!f.categoria) e.categoria = "Selecciona una categoría.";
  if (!f.prioridad) e.prioridad = "Selecciona una prioridad.";
  if (!f.edificio) e["ubicacion.edificio"] = "Selecciona un edificio.";
  if (f.piso.trim() && !/^-?\d+$/.test(f.piso.trim())) e["ubicacion.piso"] = "El piso debe ser un número entero.";
  if (!f.espacio.trim()) e["ubicacion.espacio"] = "El espacio es obligatorio.";
  return e;
}

// Convierte `detalles` del 400 ({ruta: mensaje} o arreglo) en errores por campo.
// Lo que no se pueda mapear a un campo conocido va al resumen.
function mapearDetalles(detalles, rutasConocidas) {
  const porCampo = {};
  const resumen = [];
  const pares = Array.isArray(detalles)
    ? detalles.map((d) => (typeof d === "string" ? ["", d] : [d.campo || d.path || "", d.mensaje || JSON.stringify(d)]))
    : Object.entries(detalles || {});
  for (const [ruta, msg] of pares) {
    if (rutasConocidas.has(ruta)) porCampo[ruta] = msg;
    else resumen.push(ruta ? `${ruta}: ${msg}` : msg);
  }
  return { porCampo, resumen };
}

export default function NuevaIncidencia() {
  const navegar = useNavigate();
  const [f, setF] = useState(INICIAL);
  const [detalle, setDetalle] = useState({});
  const [errores, setErrores] = useState({});
  const [resumen, setResumen] = useState([]); // errores del servidor sin campo
  const [errorApi, setErrorApi] = useState(null); // 401/403/red/otros
  const [enviando, setEnviando] = useState(false);

  const set = (campo) => (ev) => setF((s) => ({ ...s, [campo]: ev.target.value }));

  // Al cambiar de categoría se descarta el estado del bloque anterior.
  function cambiarCategoria(ev) {
    const cat = ev.target.value;
    setF((s) => ({ ...s, categoria: cat }));
    setDetalle(detalleInicial(cat));
    setErrores((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("detalle_especifico."))));
  }

  async function enviar(ev) {
    ev.preventDefault();
    if (enviando) return; // evita doble envío
    setErrorApi(null);
    setResumen([]);
    const e = { ...validarUniversales(f), ...validarDetalle(f.categoria, detalle) };
    setErrores(e);
    const primero = Object.keys(e)[0];
    if (primero) {
      document.getElementById(idDe(primero))?.focus(); // foco al primer error
      return;
    }

    // Cuerpo sin vacíos ni null; el reportante lo pone el servidor.
    const ubicacion = { edificio: f.edificio, espacio: f.espacio.trim() };
    if (f.piso.trim()) ubicacion.piso = Number(f.piso);
    const cuerpo = {
      titulo: f.titulo.trim(),
      descripcion: f.descripcion.trim(),
      categoria: f.categoria,
      prioridad: f.prioridad,
      ubicacion,
      detalle_especifico: construirDetalle(f.categoria, detalle),
    };

    setEnviando(true);
    try {
      const creada = await api.post("/incidencias", cuerpo);
      navegar(`/incidencias/${encodeURIComponent(creada.codigo)}`);
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 400 && err.detalles) {
        const conocidas = new Set([
          "titulo", "descripcion", "categoria", "prioridad",
          "ubicacion.edificio", "ubicacion.piso", "ubicacion.espacio",
          ...Object.keys(detalle).map((c) => `detalle_especifico.${c}`),
        ]);
        const { porCampo, resumen: sin } = mapearDetalles(err.detalles, conocidas);
        setErrores(porCampo);
        setResumen(sin.length > 0 || Object.keys(porCampo).length > 0 ? sin : [err.mensaje]);
      } else {
        setErrorApi(err);
      }
      setEnviando(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-emerald-800">Nueva incidencia</h1>
      <form onSubmit={enviar} noValidate className="mt-4 space-y-4">
        {resumen.length > 0 && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
            <p className="font-medium">Revisa los datos enviados:</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {resumen.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}
        {errorApi && <ErrorMensaje error={errorApi} />}

        <Campo id="titulo" etiqueta="Título" requerido error={errores.titulo} ayuda="Entre 5 y 120 caracteres">
          {(p) => <input {...p} type="text" maxLength={120} value={f.titulo} onChange={set("titulo")} />}
        </Campo>

        <Campo
          id="descripcion"
          etiqueta="Descripción"
          requerido
          error={errores.descripcion}
          ayuda={`${f.descripcion.length} / ${MAX_DESC} caracteres (mínimo 10)`}
        >
          {(p) => <textarea {...p} rows={5} maxLength={MAX_DESC} value={f.descripcion} onChange={set("descripcion")} />}
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="categoria" etiqueta="Categoría" requerido error={errores.categoria}>
            {(p) => (
              <select {...p} value={f.categoria} onChange={cambiarCategoria}>
                <option value="">Selecciona…</option>
                {Object.entries(CATEGORIAS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            )}
          </Campo>
          <Campo id="prioridad" etiqueta="Prioridad" requerido error={errores.prioridad}>
            {(p) => (
              <select {...p} value={f.prioridad} onChange={set("prioridad")}>
                <option value="">Selecciona…</option>
                {Object.entries(PRIORIDADES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            )}
          </Campo>
        </div>

        <fieldset className="space-y-4 rounded-md border border-slate-300 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Ubicación</legend>
          <Campo id="ubicacion-edificio" etiqueta="Edificio" requerido error={errores["ubicacion.edificio"]}>
            {(p) => (
              <select {...p} value={f.edificio} onChange={set("edificio")}>
                <option value="">Selecciona…</option>
                {EDIFICIOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="ubicacion-piso" etiqueta="Piso" error={errores["ubicacion.piso"]}>
              {(p) => <input {...p} type="number" inputMode="numeric" step={1} value={f.piso} onChange={set("piso")} />}
            </Campo>
            <Campo id="ubicacion-espacio" etiqueta="Espacio" requerido error={errores["ubicacion.espacio"]} ayuda="Aula, laboratorio u oficina">
              {(p) => <input {...p} type="text" value={f.espacio} onChange={set("espacio")} />}
            </Campo>
          </div>
        </fieldset>

        {f.categoria && (
          <fieldset className="space-y-4 rounded-md border border-slate-300 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">
              Detalle específico: {CATEGORIAS[f.categoria]}
            </legend>
            <BloqueDetalle
              key={f.categoria}
              categoria={f.categoria}
              valor={detalle}
              onCambio={(campo, v) => setDetalle((d) => ({ ...d, [campo]: v }))}
              errores={errores}
            />
          </fieldset>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-emerald-800 px-4 py-2.5 font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 sm:w-auto"
        >
          {enviando ? "Enviando…" : "Crear incidencia"}
        </button>
      </form>
    </section>
  );
}
