// /admin/roles: roles existentes, sus permisos y asignación de rol a un usuario.
// Cada usuario tiene un solo rol: "retirar" un rol es asignarle otro. El servidor valida todo.
import { useState } from "react";
import CabeceraAdmin from "../../components/admin/CabeceraAdmin.jsx";
import Cargando from "../../components/Cargando.jsx";
import ErrorMensaje from "../../components/ErrorMensaje.jsx";
import Icono from "../../components/Iconos.jsx";
import { api } from "../../api/cliente.js";
import { useDatosApi } from "../../hooks/useDatosApi.js";
import { NOMBRE_ROL, ROLES_ASIGNABLES, TIPOS_REPORTANTE } from "../../auth/permisos.js";

export default function AdminRoles() {
  const roles = useDatosApi("/admin/roles");
  const usuarios = useDatosApi("/admin/usuarios?limite=50");
  const [form, setForm] = useState({ id: "", rol: "tecnico", tipo: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const elegido = usuarios.datos?.datos.find((u) => u.id === form.id);
  const esSuperAdmin = elegido?.rol === "superAdmin" || form.rol === "superAdmin";

  async function asignar(e) {
    e.preventDefault();
    if (!elegido) return;
    const cuerpo = form.rol === "reportante" ? { rol: form.rol, tipo: form.tipo } : { rol: form.rol };
    const aviso = elegido.rol === "superAdmin" && form.rol !== "superAdmin"
      ? " Le quitas el acceso al módulo de administración."
      : form.rol === "superAdmin"
        ? " Un super administrador tiene acceso total a este módulo."
        : "";
    if (!window.confirm(`¿Asignar el rol ${NOMBRE_ROL[form.rol]} a ${elegido.nombre}?${aviso}`)) return;

    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      await api.patch(`/admin/usuarios/${elegido.id}/roles`, cuerpo);
      setAviso(`${elegido.nombre} ahora tiene el rol ${NOMBRE_ROL[form.rol]}.`);
      usuarios.recargar();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <CabeceraAdmin
        titulo="Roles y permisos"
        descripcion="Los permisos administrativos solo los tiene el super administrador. Los demás roles operan desde la API con sus propias reglas."
      />

      <section aria-labelledby="roles-titulo" className="mb-8">
        <h2 id="roles-titulo" className="mb-3 text-lg font-semibold text-slate-900">Roles existentes</h2>
        {roles.cargando && <Cargando texto="Cargando roles…" />}
        {roles.error && <ErrorMensaje error={roles.error} onReintentar={roles.recargar} />}
        {roles.datos && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {roles.datos.datos.map((r) => (
              <article key={r.rol} className="tarjeta p-4">
                <h3 className="font-semibold text-slate-900">{NOMBRE_ROL[r.rol]}</h3>
                <p className="mt-0.5 font-mono text-xs text-slate-600">{r.rol}</p>
                {r.permisos.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">Sin permisos de administración.</p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {r.permisos.map((p) => (
                      <li key={p} className="insignia bg-marca-50 text-marca-900">
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="asignar-titulo" className="tarjeta max-w-2xl p-5 sm:p-6">
        <h2 id="asignar-titulo" className="text-lg font-semibold text-slate-900">Asignar rol</h2>
        <p className="mt-1 text-sm text-slate-600">Para retirar un rol, asígnale a la persona otro rol.</p>

        {usuarios.cargando && <Cargando texto="Cargando usuarios…" />}
        {usuarios.error && <ErrorMensaje error={usuarios.error} onReintentar={usuarios.recargar} />}

        {usuarios.datos && (
          <form onSubmit={asignar} className="mt-4 grid gap-4">
            <label className="block">
              <span className="etiqueta-campo">Usuario</span>
              <select className="campo mt-1.5" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required>
                <option value="" disabled>
                  Elige un usuario
                </option>
                {usuarios.datos.datos.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} · {u.correo} · {NOMBRE_ROL[u.rol]}
                    {!u.activo ? " (suspendido)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="etiqueta-campo">Nuevo rol</span>
              <select className="campo mt-1.5" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value, tipo: "" })}>
                {ROLES_ASIGNABLES.map((r) => (
                  <option key={r} value={r}>
                    {NOMBRE_ROL[r]}
                  </option>
                ))}
              </select>
            </label>

            {form.rol === "reportante" && (
              <label className="block">
                <span className="etiqueta-campo">Tipo de reportante</span>
                <select className="campo mt-1.5" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} required>
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
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <Icono nombre="escudo" className="mt-0.5 shrink-0" />
                Los permisos de super administrador son sensibles. El servidor no permite quitar el último.
              </p>
            )}

            {error && <ErrorMensaje error={error} />}
            {aviso && (
              <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
                <Icono nombre="check" /> {aviso}
              </p>
            )}

            <div>
              <button type="submit" className="btn btn-primario" disabled={!elegido || enviando || (form.rol === "reportante" && !form.tipo)}>
                Asignar rol
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
