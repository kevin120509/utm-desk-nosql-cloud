// Panel del superAdmin: usuarios y roles, bitácora, seguridad y estado del sistema.
// El servidor valida cada acción; aquí solo se evita ofrecer lo que sabemos que será rechazado.
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/cliente.js";
import { useSesion } from "../auth/SesionContext.jsx";
import { NOMBRE_ROL, ROLES_TODOS } from "../auth/permisos.js";
import { CATEGORIAS } from "../catalogo.js";
import Campo from "../components/Campo.jsx";
import Cargando from "../components/Cargando.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";

const PESTANAS = [
  { id: "resumen", texto: "Resumen" },
  { id: "usuarios", texto: "Usuarios" },
  { id: "tecnicos", texto: "Técnicos" },
  { id: "catalogos", texto: "Catálogos" },
  { id: "bitacora", texto: "Bitácora" },
  { id: "seguridad", texto: "Seguridad" },
  { id: "sistema", texto: "Sistema" },
];

const TIPOS = ["docente", "estudiante", "administrativo"];

const fechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" }) : "";

// Carga una URL al montar (o cuando cambia) y expone { datos, error, cargando, recargar }.
function useApi(ruta) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });
  const cargar = useCallback(() => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    api
      .get(ruta)
      .then((datos) => setEstado({ datos, error: null, cargando: false }))
      .catch((error) => setEstado({ datos: null, error, cargando: false }));
  }, [ruta]);
  useEffect(cargar, [cargar]);
  return { ...estado, recargar: cargar };
}

function Insignia({ ok, children }) {
  return <span className={`insignia ${ok ? "bg-marca-50 text-marca-800" : "bg-red-50 text-red-800"}`}>{children}</span>;
}

// ---------------------------------------------------------------- Resumen
function Resumen() {
  const { datos, error, cargando } = useApi("/admin/resumen");
  if (cargando) return <Cargando />;
  if (error) return <ErrorMensaje error={error} />;
  const { usuarios, incidencias } = datos;
  const tarjetas = [
    { t: "Usuarios", v: usuarios.total },
    { t: "Suspendidos", v: usuarios.suspendidos },
    { t: "Incidencias", v: incidencias.total },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {tarjetas.map((x) => (
          <div key={x.t} className="tarjeta p-5">
            <p className="text-sm text-slate-600">{x.t}</p>
            <p className="font-display text-3xl font-semibold text-slate-900">{x.v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Lista titulo="Usuarios por rol" datos={usuarios.porRol} traducir={(k) => NOMBRE_ROL[k] || k} />
        <Lista titulo="Incidencias por estado" datos={incidencias.porEstado} />
        <Lista titulo="Incidencias por categoría" datos={incidencias.porCategoria} />
      </div>
      <p className="text-sm text-slate-600">
        Las gráficas completas (por edificio y etiquetas) están en la sección Analítica.
      </p>
    </div>
  );
}

function Lista({ titulo, datos, traducir = (k) => k }) {
  const filas = Object.entries(datos || {});
  return (
    <div className="tarjeta p-5">
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      <ul className="mt-3 space-y-1.5 text-sm">
        {filas.length === 0 && <li className="text-slate-600">Sin datos.</li>}
        {filas.map(([k, v]) => (
          <li key={k} className="flex justify-between gap-3">
            <span className="text-slate-700">{traducir(k)}</span>
            <span className="font-semibold text-slate-900">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- Usuarios
function Usuarios() {
  const { usuario: yo } = useSesion();
  const [q, setQ] = useState("");
  const [rol, setRol] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [aviso, setAviso] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [creando, setCreando] = useState(false);
  const params = new URLSearchParams();
  if (busqueda) params.set("q", busqueda);
  if (rol) params.set("rol", rol);
  const { datos, error, cargando, recargar } = useApi(`/admin/usuarios?${params}`);

  async function accion(promesa, mensaje) {
    setErrorAccion(null);
    setAviso(null);
    try {
      await promesa;
      setAviso(mensaje);
      recargar();
    } catch (e) {
      setErrorAccion(e);
    }
  }

  function cambiarRol(u, nuevo) {
    if (nuevo === u.rol) return;
    const cuerpo = { rol: nuevo };
    if (nuevo === "reportante" && !u.tipo) cuerpo.tipo = "docente";
    if (!window.confirm(`¿Cambiar el rol de ${u.nombre} a ${NOMBRE_ROL[nuevo]}?`)) return;
    accion(api.patch(`/admin/usuarios/${u.id}/rol`, cuerpo), `Rol de ${u.nombre} actualizado.`);
  }

  function cambiarEstado(u) {
    const activar = !u.activo;
    if (!activar && !window.confirm(`¿Suspender a ${u.nombre}? No podrá iniciar sesión.`)) return;
    accion(api.patch(`/admin/usuarios/${u.id}/estado`, { activo: activar }), activar ? `${u.nombre} fue activado.` : `${u.nombre} fue suspendido.`);
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBusqueda(q.trim());
        }}
      >
        <div className="min-w-48 flex-1">
          <label htmlFor="buscar-usuario" className="etiqueta-campo">Buscar por nombre o correo</label>
          <input id="buscar-usuario" className="campo mt-1.5" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label htmlFor="filtro-rol" className="etiqueta-campo">Rol</label>
          <select id="filtro-rol" className="campo mt-1.5" value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="">Todos</option>
            {ROLES_TODOS.map((r) => (
              <option key={r} value={r}>{NOMBRE_ROL[r]}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secundario">Buscar</button>
        <button type="button" className="btn btn-primario" onClick={() => setCreando((v) => !v)}>
          {creando ? "Cerrar" : "Nuevo usuario"}
        </button>
      </form>

      {creando && (
        <FormularioUsuario
          alCrear={() => {
            setCreando(false);
            setAviso("Usuario creado.");
            recargar();
          }}
        />
      )}

      {aviso && <p role="status" className="rounded-lg bg-marca-50 p-3 text-sm font-medium text-marca-800">{aviso}</p>}
      {errorAccion && <ErrorMensaje error={errorAccion} />}
      {cargando && <Cargando />}
      {error && <ErrorMensaje error={error} onReintentar={recargar} />}

      {datos && (
        <div className="tarjeta overflow-x-auto">
          <table className="w-full min-w-176 text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-700">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.datos.map((u) => {
                const esYo = u.id === yo.id;
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-medium text-slate-900">{u.nombre}{esYo && <span className="text-slate-500"> (tú)</span>}</td>
                    <td className="p-3 text-slate-700">{u.correo}</td>
                    <td className="p-3">
                      <select
                        aria-label={`Rol de ${u.nombre}`}
                        className="campo min-h-9! py-1!"
                        value={u.rol}
                        disabled={esYo}
                        onChange={(e) => cambiarRol(u, e.target.value)}
                      >
                        {ROLES_TODOS.map((r) => (
                          <option key={r} value={r}>{NOMBRE_ROL[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3"><Insignia ok={u.activo}>{u.activo ? "Activo" : "Suspendido"}</Insignia></td>
                    <td className="p-3">
                      <button type="button" disabled={esYo} onClick={() => cambiarEstado(u)} className="btn btn-secundario min-h-9! py-1!">
                        {u.activo ? "Suspender" : "Activar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {datos.datos.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-600">No hay usuarios con ese filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {datos && <p className="text-sm text-slate-600">{datos.total} usuario(s) en total.</p>}
    </div>
  );
}

function FormularioUsuario({ alCrear }) {
  const [f, setF] = useState({ nombre: "", correo: "", password: "", rol: "tecnico", tipo: "docente" });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const set = (c) => (e) => setF((v) => ({ ...v, [c]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const cuerpo = { nombre: f.nombre.trim(), correo: f.correo.trim(), password: f.password, rol: f.rol };
    if (f.rol === "reportante") cuerpo.tipo = f.tipo;
    try {
      await api.post("/admin/usuarios", cuerpo);
      alCrear();
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="tarjeta grid gap-4 p-5 sm:grid-cols-2" noValidate>
      <Campo id="nu-nombre" etiqueta="Nombre" requerido>
        {(p) => <input {...p} value={f.nombre} onChange={set("nombre")} />}
      </Campo>
      <Campo id="nu-correo" etiqueta="Correo" requerido>
        {(p) => <input {...p} type="email" value={f.correo} onChange={set("correo")} />}
      </Campo>
      <Campo id="nu-pass" etiqueta="Contraseña inicial" requerido ayuda="Mínimo 8 caracteres. Se guarda cifrada y nadie puede consultarla.">
        {(p) => <input {...p} type="password" autoComplete="new-password" value={f.password} onChange={set("password")} />}
      </Campo>
      <Campo id="nu-rol" etiqueta="Rol" requerido>
        {(p) => (
          <select {...p} value={f.rol} onChange={set("rol")}>
            {ROLES_TODOS.map((r) => (
              <option key={r} value={r}>{NOMBRE_ROL[r]}</option>
            ))}
          </select>
        )}
      </Campo>
      {f.rol === "reportante" && (
        <Campo id="nu-tipo" etiqueta="Tipo de persona" requerido>
          {(p) => (
            <select {...p} value={f.tipo} onChange={set("tipo")}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </Campo>
      )}
      {error && <div className="sm:col-span-2"><ErrorMensaje error={error} /></div>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={enviando} className="btn btn-primario">{enviando ? "Creando…" : "Crear usuario"}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Técnicos
function Tecnicos() {
  const { datos, error, cargando, recargar } = useApi("/admin/tecnicos");
  const [errorAccion, setErrorAccion] = useState(null);

  async function guardar(u, cambios) {
    setErrorAccion(null);
    try {
      await api.patch(`/admin/tecnicos/${u.id}`, cambios);
      recargar();
    } catch (e) {
      setErrorAccion(e);
    }
  }

  const alternarCategoria = (u, clave) => {
    const actuales = u.categorias ?? [];
    guardar(u, { categorias: actuales.includes(clave) ? actuales.filter((c) => c !== clave) : [...actuales, clave] });
  };

  if (cargando) return <Cargando />;
  if (error) return <ErrorMensaje error={error} onReintentar={recargar} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Para registrar un técnico nuevo usa Usuarios → Nuevo usuario con el rol Técnico. Aquí defines si está disponible y qué categorías atiende.
      </p>
      {errorAccion && <ErrorMensaje error={errorAccion} />}
      <div className="grid gap-4 md:grid-cols-2">
        {datos.datos.map((u) => (
          <div key={u.id} className="tarjeta space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{u.nombre}</p>
                <p className="truncate text-sm text-slate-600">{u.correo}</p>
              </div>
              <Insignia ok={u.disponible}>{u.disponible ? "Disponible" : "No disponible"}</Insignia>
            </div>
            <fieldset>
              <legend className="etiqueta-campo">Categorías que atiende</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {Object.entries(CATEGORIAS).map(([clave, nombre]) => (
                  <label key={clave} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-800">
                    <input type="checkbox" checked={(u.categorias ?? []).includes(clave)} onChange={() => alternarCategoria(u, clave)} />
                    {nombre}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" className="btn btn-secundario min-h-9! py-1!" onClick={() => guardar(u, { disponible: !u.disponible })}>
              {u.disponible ? "Marcar no disponible" : "Marcar disponible"}
            </button>
          </div>
        ))}
        {datos.datos.length === 0 && <p className="text-slate-600">No hay técnicos registrados.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Catálogos
function Catalogos() {
  const { datos, error, cargando, recargar } = useApi("/admin/catalogos");
  const [errorAccion, setErrorAccion] = useState(null);
  const [nuevoEdificio, setNuevoEdificio] = useState("");

  async function accion(promesa) {
    setErrorAccion(null);
    try {
      await promesa;
      recargar();
      return true;
    } catch (e) {
      setErrorAccion(e);
      return false;
    }
  }

  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorMensaje error={error} onReintentar={recargar} />;

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        Nada se borra: lo que ya no se use se desactiva y deja de aparecer al reportar. Las incidencias anteriores conservan sus datos.
      </p>
      {errorAccion && <ErrorMensaje error={errorAccion} />}

      <section aria-labelledby="h-categorias" className="space-y-3">
        <h2 id="h-categorias" className="font-display text-lg font-semibold text-slate-900">Categorías</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {datos.categorias.map((c) => (
            <FilaCategoria key={c.clave} c={c} guardar={(cambios) => accion(api.patch(`/admin/catalogos/categorias/${c.clave}`, cambios))} />
          ))}
        </div>
      </section>

      <section aria-labelledby="h-edificios" className="space-y-3">
        <h2 id="h-edificios" className="font-display text-lg font-semibold text-slate-900">Edificios y espacios</h2>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await accion(api.post("/admin/catalogos/edificios", { nombre: nuevoEdificio.trim() }))) setNuevoEdificio("");
          }}
        >
          <div className="min-w-48 flex-1">
            <label htmlFor="nuevo-edificio" className="etiqueta-campo">Nuevo edificio</label>
            <input id="nuevo-edificio" className="campo mt-1.5" value={nuevoEdificio} onChange={(e) => setNuevoEdificio(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primario" disabled={nuevoEdificio.trim().length < 2}>Agregar edificio</button>
        </form>
        <div className="grid gap-4 lg:grid-cols-2">
          {datos.edificios.map((e) => (
            <TarjetaEdificio key={e.id} e={e} accion={accion} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FilaCategoria({ c, guardar }) {
  const [nombre, setNombre] = useState(c.nombre);
  return (
    <div className="tarjeta space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.clave}</span>
        <Insignia ok={c.activo}>{c.activo ? "Activa" : "Desactivada"}</Insignia>
      </div>
      <label htmlFor={`cat-${c.clave}`} className="etiqueta-campo">Nombre</label>
      <input id={`cat-${c.clave}`} className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <div className="flex gap-2">
        <button type="button" className="btn btn-secundario min-h-9! py-1!" disabled={nombre.trim() === c.nombre || nombre.trim().length < 2} onClick={() => guardar({ nombre: nombre.trim() })}>
          Guardar nombre
        </button>
        <button type="button" className="btn btn-secundario min-h-9! py-1!" onClick={() => guardar({ activo: !c.activo })}>
          {c.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  );
}

function TarjetaEdificio({ e, accion }) {
  const [espacio, setEspacio] = useState("");
  return (
    <div className="tarjeta space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{e.nombre}</h3>
        <div className="flex items-center gap-2">
          <Insignia ok={e.activo}>{e.activo ? "Activo" : "Desactivado"}</Insignia>
          <button type="button" className="btn btn-secundario min-h-9! py-1!" onClick={() => accion(api.patch(`/admin/catalogos/edificios/${e.id}`, { activo: !e.activo }))}>
            {e.activo ? "Desactivar" : "Activar"}
          </button>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {e.espacios.length === 0 && <li className="text-slate-600">Sin espacios definidos: al reportar se escribe a mano.</li>}
        {e.espacios.map((s) => (
          <li key={s.nombre} className="flex items-center justify-between gap-2">
            <span className={s.activo ? "text-slate-800" : "text-slate-500 line-through"}>{s.nombre}</span>
            <button
              type="button"
              className="btn btn-fantasma min-h-8! py-0.5!"
              onClick={() => accion(api.patch(`/admin/catalogos/edificios/${e.id}/espacios/${encodeURIComponent(s.nombre)}`, { activo: !s.activo }))}
            >
              {s.activo ? "Desactivar" : "Activar"}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (await accion(api.post(`/admin/catalogos/edificios/${e.id}/espacios`, { nombre: espacio.trim() }))) setEspacio("");
        }}
      >
        <label htmlFor={`esp-${e.id}`} className="sr-only">Nuevo espacio en {e.nombre}</label>
        <input id={`esp-${e.id}`} className="campo min-h-9! py-1!" placeholder="Nuevo espacio (aula, laboratorio…)" value={espacio} onChange={(ev) => setEspacio(ev.target.value)} />
        <button type="submit" className="btn btn-secundario min-h-9! py-1!" disabled={espacio.trim().length < 2}>Agregar</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Bitácora y seguridad
const ETIQUETA_ACCION = {
  "usuario.crear": "Usuario creado",
  "usuario.actualizar": "Usuario actualizado",
  "usuario.cambiar_rol": "Rol cambiado",
  "usuario.activar": "Usuario activado",
  "usuario.suspender": "Usuario suspendido",
  "usuario.registro": "Registro público",
  "tecnico.actualizar": "Técnico actualizado",
  "catalogo.categoria_actualizar": "Categoría actualizada",
  "catalogo.edificio_crear": "Edificio creado",
  "catalogo.edificio_actualizar": "Edificio actualizado",
  "catalogo.espacio_crear": "Espacio creado",
  "catalogo.espacio_actualizar": "Espacio actualizado",
  "login.ok": "Inicio de sesión",
  "login.fallido": "Inicio de sesión fallido",
  "acceso.denegado": "Acceso denegado",
};

function describir(e) {
  const d = e.detalle || {};
  if (e.accion === "usuario.cambiar_rol") return `${NOMBRE_ROL[d.de] || d.de} → ${NOMBRE_ROL[d.a] || d.a}`;
  if (e.accion === "login.fallido") return d.correo || "";
  if (e.accion === "acceso.denegado") return `${d.metodo} ${d.ruta}`;
  if (d.correo) return d.correo;
  return "";
}

function Eventos({ ruta, vacio }) {
  const [pagina, setPagina] = useState(1);
  const { datos, error, cargando, recargar } = useApi(`${ruta}?pagina=${pagina}`);
  if (cargando) return <Cargando />;
  if (error) return <ErrorMensaje error={error} onReintentar={recargar} />;
  const paginas = Math.max(1, Math.ceil(datos.total / 30));
  return (
    <div className="space-y-3">
      <div className="tarjeta overflow-x-auto">
        <table className="w-full min-w-176 text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-700">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Acción</th>
              <th className="p-3">Quién</th>
              <th className="p-3">Detalle</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {datos.datos.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap p-3 text-slate-700">{fechaHora(e.fecha)}</td>
                <td className="p-3 font-medium text-slate-900">{ETIQUETA_ACCION[e.accion] || e.accion}</td>
                <td className="p-3 text-slate-700">{e.actor ? `${e.actor.nombre} (${NOMBRE_ROL[e.actor.rol] || e.actor.rol})` : "—"}</td>
                <td className="p-3 text-slate-700">{describir(e)}</td>
                <td className="p-3 text-slate-600">{e.ip || "—"}</td>
              </tr>
            ))}
            {datos.datos.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-600">{vacio}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span>{datos.total} evento(s). La bitácora es de solo lectura.</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-secundario min-h-9! py-1!" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span>Página {pagina} de {paginas}</span>
          <button type="button" className="btn btn-secundario min-h-9! py-1!" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sistema
function Sistema() {
  const { datos, error, cargando, recargar } = useApi("/admin/salud");
  if (cargando) return <Cargando texto="Revisando servicios…" />;
  if (error) return <ErrorMensaje error={error} onReintentar={recargar} />;
  const servicios = [
    { t: "API", ...datos.api },
    { t: "MongoDB Atlas", ...datos.mongo },
    { t: "Almacenamiento (Supabase)", ...datos.almacenamiento },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {servicios.map((s) => (
          <div key={s.t} className="tarjeta p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{s.t}</h3>
              <Insignia ok={s.ok}>{s.ok ? "En línea" : "Con problemas"}</Insignia>
            </div>
            <p className="mt-2 text-sm text-slate-700">{s.detalle}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>Revisado: {fechaHora(datos.hora)}</span>
        <button type="button" className="btn btn-secundario min-h-9! py-1!" onClick={recargar}>Revisar de nuevo</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Página
export default function Administracion() {
  const [pestana, setPestana] = useState("resumen");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900">Administración</h1>
        <p className="mt-1 text-slate-600">Cuentas, roles y estado del sistema. Cada acción queda registrada en la bitácora.</p>
      </header>

      <div role="tablist" aria-label="Secciones de administración" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            type="button"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`btn min-h-10! ${pestana === p.id ? "btn-primario" : "btn-secundario"}`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      <section role="tabpanel">
        {pestana === "resumen" && <Resumen />}
        {pestana === "usuarios" && <Usuarios />}
        {pestana === "tecnicos" && <Tecnicos />}
        {pestana === "catalogos" && <Catalogos />}
        {pestana === "bitacora" && <Eventos key="b" ruta="/admin/bitacora" vacio="Todavía no hay acciones administrativas registradas." />}
        {pestana === "seguridad" && <Eventos key="s" ruta="/admin/seguridad" vacio="Todavía no hay eventos de seguridad." />}
        {pestana === "sistema" && <Sistema />}
      </section>
    </div>
  );
}
