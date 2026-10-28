// Pantalla "Nueva incidencia" (plan §10): campos universales + bloque por categoría.
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, ErrorApi } from "../api/cliente.js";
import { CATEGORIAS, PRIORIDADES, ICONO_CATEGORIA, DESCRIPCION_CATEGORIA, DESCRIPCION_PRIORIDAD } from "../catalogo.js";
import useCatalogos from "../hooks/useCatalogos.js";
import Campo from "../components/Campo.jsx";
import GrupoTarjetas from "../components/GrupoTarjetas.jsx";
import Icono from "../components/Iconos.jsx";
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
  const catalogos = useCatalogos();
  const [f, setF] = useState(INICIAL);
  const [detalle, setDetalle] = useState({});
  const [errores, setErrores] = useState({});
  const [resumen, setResumen] = useState([]); // errores del servidor sin campo
  const [errorApi, setErrorApi] = useState(null); // 401/403/red/otros
  const [enviando, setEnviando] = useState(false);

  // Si el superAdmin definió espacios para el edificio elegido, el espacio se escoge de la lista.
  const espaciosDelEdificio = catalogos.edificios.find((e) => e.nombre === f.edificio)?.espacios ?? [];

  // Nombre del campo del formulario -> clave de su error (igual que en el cuerpo de la petición).
  const CLAVE_ERROR = { edificio: "ubicacion.edificio", piso: "ubicacion.piso", espacio: "ubicacion.espacio" };
  // Al corregir un campo se quita su error: no debe seguir en rojo algo que ya está bien.
  const quitarError = (clave) =>
    setErrores((e) => {
      if (!(clave in e)) return e;
      const { [clave]: _quitado, ...resto } = e;
      return resto;
    });

  const set = (campo) => (ev) => {
    const valor = ev.target.value;
    // Al cambiar de edificio se limpia el espacio: pudo ser de la lista del anterior.
    setF((s) => ({ ...s, [campo]: valor, ...(campo === "edificio" ? { espacio: "" } : {}) }));
    quitarError(CLAVE_ERROR[campo] || campo);
  };

  // Al cambiar de categoría se descarta el estado del bloque anterior.
  function cambiarCategoria(ev) {
    const cat = ev.target.value;
    setF((s) => ({ ...s, categoria: cat }));
    setDetalle(detalleInicial(cat));
    setErrores((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== "categoria" && !k.startsWith("detalle_especifico."))));
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
      // Foco al primer error. Categoría y prioridad son grupos de radios: se enfoca la primera opción.
      const destino = document.getElementById(idDe(primero)) || document.querySelector(`input[name="${primero}"]`);
      destino?.focus();
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
    <section className="mx-auto max-w-3xl">
      <h1 className="titulo-pagina">Nueva incidencia</h1>
      <p className="subtitulo-pagina">Cuéntanos qué pasó y dónde. Mientras más datos, más rápido se atiende.</p>
      <form onSubmit={enviar} noValidate className="mt-6 space-y-6">
        {resumen.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
            <p className="font-medium">Revisa los datos enviados:</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {resumen.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}
        {errorApi && <ErrorMensaje error={errorApi} />}

        <section aria-labelledby="sec-general" className="tarjeta space-y-5 p-5 sm:p-6">
          <h2 id="sec-general" className="flex items-center gap-3 font-display text-lg font-semibold text-slate-900"><span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-acento text-sm font-semibold text-marca-950">1</span>¿Qué ocurre?</h2>
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

        <GrupoTarjetas
          nombre="categoria"
          etiqueta="Categoría"
          requerido
          valor={f.categoria}
          onChange={cambiarCategoria}
          error={errores.categoria}
          opciones={catalogos.categorias.map((c) => ({ valor: c.clave, titulo: c.nombre, descripcion: DESCRIPCION_CATEGORIA[c.clave], icono: ICONO_CATEGORIA[c.clave] }))}
        />

        <GrupoTarjetas
          nombre="prioridad"
          etiqueta="Prioridad"
          requerido
          valor={f.prioridad}
          onChange={set("prioridad")}
          error={errores.prioridad}
          columnas="sm:grid-cols-2 lg:grid-cols-4"
          opciones={Object.entries(PRIORIDADES).map(([v, t]) => ({
            valor: v,
            titulo: t,
            descripcion: DESCRIPCION_PRIORIDAD[v],
            punto: { baja: "bg-slate-400", media: "bg-yellow-400", alta: "bg-orange-500", critica: "bg-red-600" }[v],
          }))}
        />

        </section>

        <section aria-labelledby="sec-ubicacion" className="tarjeta space-y-5 p-5 sm:p-6">
          <h2 id="sec-ubicacion" className="flex items-center gap-3 font-display text-lg font-semibold text-slate-900"><span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-acento text-sm font-semibold text-marca-950">2</span>¿Dónde?</h2>
          <Campo id="ubicacion-edificio" etiqueta="Edificio" requerido error={errores["ubicacion.edificio"]}>
            {(p) => (
              <select {...p} value={f.edificio} onChange={set("edificio")}>
                <option value="">Selecciona…</option>
                {catalogos.edificios.map((e) => <option key={e.nombre} value={e.nombre}>{e.nombre}</option>)}
              </select>
            )}
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="ubicacion-piso" etiqueta="Piso" error={errores["ubicacion.piso"]}>
              {(p) => <input {...p} type="number" inputMode="numeric" step={1} value={f.piso} onChange={set("piso")} />}
            </Campo>
            <Campo id="ubicacion-espacio" etiqueta="Espacio" requerido error={errores["ubicacion.espacio"]} ayuda="Aula, laboratorio u oficina">
              {(p) =>
                espaciosDelEdificio.length > 0 ? (
                  <select {...p} value={f.espacio} onChange={set("espacio")}>
                    <option value="">Selecciona…</option>
                    {espaciosDelEdificio.map((s) => <option key={s.nombre} value={s.nombre}>{s.nombre}</option>)}
                  </select>
                ) : (
                  <input {...p} type="text" value={f.espacio} onChange={set("espacio")} />
                )
              }
            </Campo>
          </div>
        </section>

        {f.categoria && (
          <section aria-labelledby="sec-detalle" className="tarjeta space-y-5 p-5 sm:p-6">
            <h2 id="sec-detalle" className="flex items-center gap-3 font-display text-lg font-semibold text-slate-900">
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-acento text-sm font-semibold text-marca-950">3</span>
              Detalle técnico · {CATEGORIAS[f.categoria]}
            </h2>
            <BloqueDetalle
              key={f.categoria}
              categoria={f.categoria}
              valor={detalle}
              onCambio={(campo, v) => {
                setDetalle((d) => ({ ...d, [campo]: v }));
                quitarError(`detalle_especifico.${campo}`);
              }}
              errores={errores}
            />
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={enviando} className="btn btn-primario w-full sm:w-auto">
            <Icono nombre="check" />
            {enviando ? "Enviando…" : "Crear incidencia"}
          </button>
          <Link to="/incidencias" className="btn btn-secundario w-full sm:w-auto">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}
