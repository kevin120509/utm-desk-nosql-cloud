// /admin/usuarios: consultar, buscar, filtrar, activar/suspender y asignar rol.
// No muestra contraseñas (la API nunca las envía). Cada cambio pide confirmación.
import { useState } from "react";
import CabeceraAdmin from "../../components/admin/CabeceraAdmin.jsx";
import Cargando from "../../components/Cargando.jsx";
import ErrorMensaje from "../../components/ErrorMensaje.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Icono from "../../components/Iconos.jsx";
import Paginacion from "../../components/Paginacion.jsx";
import { api } from "../../api/cliente.js";
import { useDatosApi } from "../../hooks/useDatosApi.js";
import { NOMBRE_ROL, ROLES_ASIGNABLES, TIPOS_REPORTANTE } from "../../auth/permisos.js";

const LIMITE = 10;
const VACIO = { q: "", rol: "", activo: "" };

// Construye la query solo con los filtros que tienen valor.
function queryDe({ q, rol, activo, pagina }) {
  const p = new URLSearchParams({ pagina: String(pagina), limite: String(LIMITE) });
  if (q) p.set("q", q);
  if (rol) p.set("rol", rol);
  if (activo) p.set("activo", activo);
  return p.toString();
}

function Insignia({ activo }) {
  return activo ? (
    <span className="insignia bg-emerald-100 text-emerald-900">Activo</span>
  ) : (
    <span className="insignia bg-amber-100 text-amber-900">Suspendido</span>
  );
}

// Detalle del usuario con sus acciones. Los cambios piden confirmación con el nombre del usuario.
function PanelUsuario({ usuario, alCambiar }) {
  const [rol, setRol] = useState(usuario.rol);
  const [tipo, setTipo] = useState(usuario.tipo ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  // Al cambiar de usuario se reinician los controles.
  const [id, setId] = useState(usuario.id);
  if (id !== usuario.id) {
    setId(usuario.id);
    setRol(usuario.rol);
    setTipo(usuario.tipo ?? "");
    setError(null);
    setAviso(null);
  }

  async function ejecutar(ruta, cuerpo, pregunta, textoOk) {
    if (!window.confirm(pregunta)) return;
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      await api.patch(ruta, cuerpo);
      setAviso(textoOk);
      alCambiar();
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  }

  const cambiarEstado = () =>
    ejecutar(
      `/admin/usuarios/${usuario.id}/estado`,
      { activo: !usuario.activo },
      usuario.activo
        ? `¿Suspender la cuenta de ${usuario.nombre}? No podrá iniciar sesión hasta que la actives.`
        : `¿Activar la cuenta de ${usuario.nombre}?`,
      usuario.activo ? "Cuenta suspendida." : "Cuenta activada.",
    );

  const cambiarRol = (e) => {
    e.preventDefault();
    const cuerpo = rol === "reportante" ? { rol, tipo } : { rol };
    const quitaSuperAdmin = usuario.rol === "superAdmin" && rol !== "superAdmin";
    const daSuperAdmin = rol === "superAdmin" && usuario.rol !== "superAdmin";
    const aviso = quitaSuperAdmin
      ? " Le quitas el acceso al módulo de administración."
      : daSuperAdmin
        ? " Un super administrador tiene acceso total a este módulo."
        : "";
    ejecutar(
      `/admin/usuarios/${usuario.id}/roles`,
      cuerpo,
      `¿Cambiar el rol de ${usuario.nombre} a ${NOMBRE_ROL[rol]}?${aviso}`,
      `Rol actualizado a ${NOMBRE_ROL[rol]}.`,
    );
  };

  const cambioPendiente = rol !== usuario.rol || (rol === "reportante" && tipo !== (usuario.tipo ?? ""));
  const esSuperAdmin = usuario.rol === "superAdmin" || rol === "superAdmin";

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-600">Nombre</dt>
          <dd className="font-semibold text-slate-900">{usuario.nombre}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Correo</dt>
          <dd className="break-all font-medium text-slate-900">{usuario.correo}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Rol</dt>
          <dd className="font-medium text-slate-900">
            {NOMBRE_ROL[usuario.rol] ?? usuario.rol}
            {usuario.tipo && <span className="text-slate-600"> · {usuario.tipo}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-slate-600">Estado</dt>
          <dd>
            <Insignia activo={usuario.activo} />
          </dd>
        </div>
      </dl>

      {error && <ErrorMensaje error={error} />}
      {aviso && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
          <Icono nombre="check" /> {aviso}
        </p>
      )}

      <section aria-labelledby="estado-titulo" className="border-t border-slate-200 pt-5">
        <h3 id="estado-titulo" className="font-semibold text-slate-900">Estado de la cuenta</h3>
        <p className="mt-1 text-sm text-slate-600">Suspender es una desactivación lógica: la cuenta y su historial se conservan.</p>
        <button type="button" onClick={cambiarEstado} disabled={enviando} className={`btn mt-3 ${usuario.activo ? "btn-peligro" : "btn-primario"}`}>
          {usuario.activo ? "Suspender cuenta" : "Activar cuenta"}
        </button>
      </section>

      <section aria-labelledby="rol-titulo" className="border-t border-slate-200 pt-5">
        <h3 id="rol-titulo" className="font-semibold text-slate-900">Asignar rol</h3>
        <form onSubmit={cambiarRol} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="etiqueta-campo">Rol</span>
            <select className="campo mt-1.5" value={rol} onChange={(e) => setRol(e.target.value)}>
              {ROLES_ASIGNABLES.map((r) => (
                <option key={r} value={r}>
                  {NOMBRE_ROL[r]}
                </option>
              ))}
            </select>
          </label>
          {rol === "reportante" && (
            <label className="block">
              <span className="etiqueta-campo">Tipo de reportante</span>
              <select className="campo mt-1.5" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                <option value="" disabled>
                  Elige un tipo
                </option>
                {TIPOS_REPORTANTE.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
          {esSuperAdmin && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
              <Icono nombre="escudo" className="mt-0.5 shrink-0" />
              Cambiar el rol de un super administrador es una acción sensible. El servidor impide quitar el último.
            </p>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={!cambioPendiente || enviando || (rol === "reportante" && !tipo)} className="btn btn-primario">
              Guardar rol
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AdminUsuarios() {
  const [filtros, setFiltros] = useState({ ...VACIO, pagina: 1 });
  const [borrador, setBorrador] = useState(VACIO);
  const [seleccionado, setSeleccionado] = useState(null);

  const lista = useDatosApi(`/admin/usuarios?${queryDe(filtros)}`);
  const detalle = useDatosApi(seleccionado ? `/admin/usuarios/${seleccionado}` : null);

  function buscar(e) {
    e.preventDefault();
    setFiltros({ ...borrador, pagina: 1 });
  }

  function limpiar() {
    setBorrador(VACIO);
    setFiltros({ ...VACIO, pagina: 1 });
  }

  // Tras un cambio se recargan la lista y el detalle abierto.
  function alCambiar() {
    lista.recargar();
    detalle.recargar();
  }

  return (
    <>
      <CabeceraAdmin titulo="Usuarios" descripcion="Busca cuentas, cambia su estado o asigna su rol. Nunca se elimina un usuario: se suspende." />

      <form onSubmit={buscar} role="search" aria-label="Buscar usuarios" className="tarjeta mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="block">
          <span className="etiqueta-campo">Nombre o correo</span>
          <input className="campo mt-1.5" value={borrador.q} onChange={(e) => setBorrador({ ...borrador, q: e.target.value })} placeholder="Ej. ana.pech" />
        </label>
        <label className="block">
          <span className="etiqueta-campo">Rol</span>
          <select className="campo mt-1.5" value={borrador.rol} onChange={(e) => setBorrador({ ...borrador, rol: e.target.value })}>
            <option value="">Todos</option>
            {ROLES_ASIGNABLES.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiqueta-campo">Estado</span>
          <select className="campo mt-1.5" value={borrador.activo} onChange={(e) => setBorrador({ ...borrador, activo: e.target.value })}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Suspendidos</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primario">
            <Icono nombre="buscar" /> Buscar
          </button>
          <button type="button" onClick={limpiar} className="btn btn-secundario">
            Limpiar
          </button>
        </div>
      </form>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="lista-usuarios" className="tarjeta p-4 sm:p-5">
          <h2 id="lista-usuarios" className="sr-only">Resultados</h2>
          {lista.cargando && <Cargando texto="Buscando usuarios…" />}
          {lista.error && <ErrorMensaje error={lista.error} onReintentar={lista.recargar} />}
          {!lista.cargando && !lista.error && lista.datos.total === 0 && (
            <EstadoVacio titulo="Sin usuarios" texto="Ningún usuario coincide con la búsqueda." />
          )}
          {!lista.cargando && !lista.error && lista.datos.total > 0 && (
            <>
              <ul className="divide-y divide-slate-200">
                {lista.datos.datos.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSeleccionado(u.id)}
                      aria-pressed={seleccionado === u.id}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-marca-50 ${
                        seleccionado === u.id ? "bg-marca-50" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{u.nombre}</span>
                        <span className="block truncate text-sm text-slate-600">
                          {u.correo} · {NOMBRE_ROL[u.rol] ?? u.rol}
                        </span>
                      </span>
                      <Insignia activo={u.activo} />
                    </button>
                  </li>
                ))}
              </ul>
              <Paginacion
                unidad={["usuario", "usuarios"]}
                pagina={filtros.pagina}
                limite={LIMITE}
                total={lista.datos.total}
                onCambiar={(p) => setFiltros({ ...filtros, pagina: p })}
              />
            </>
          )}
        </section>

        <section aria-labelledby="detalle-usuario" className="tarjeta p-4 sm:p-5">
          <h2 id="detalle-usuario" className="mb-4 text-lg font-semibold text-slate-900">
            Detalle
          </h2>
          {!seleccionado && <EstadoVacio icono="usuario" titulo="Elige un usuario" texto="Selecciona una cuenta de la lista para ver y cambiar su estado o rol." />}
          {seleccionado && detalle.cargando && !detalle.datos && <Cargando texto="Cargando usuario…" />}
          {seleccionado && detalle.error && <ErrorMensaje error={detalle.error} onReintentar={detalle.recargar} />}
          {seleccionado && detalle.datos && <PanelUsuario usuario={detalle.datos} alCambiar={alCambiar} />}
        </section>
      </div>
    </>
  );
}
