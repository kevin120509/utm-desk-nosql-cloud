import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSesion } from "../auth/SesionContext.jsx";
import { ROLES_CREAR, ROLES_ANALITICA, NOMBRE_ROL } from "../auth/permisos.js";

const enlaceBase =
  "rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

// Marco común: encabezado con usuario, menú por rol y contenido.
export default function Layout() {
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();

  // Menú según el rol (plan §5).
  const enlaces = [{ a: "/incidencias", texto: "Incidencias" }];
  if (ROLES_CREAR.includes(usuario.rol)) enlaces.push({ a: "/incidencias/nueva", texto: "Nueva incidencia" });
  if (ROLES_ANALITICA.includes(usuario.rol)) enlaces.push({ a: "/analitica", texto: "Analítica" });

  function salir() {
    cerrarSesion();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <span className="text-xl font-bold text-emerald-800">UTM Desk</span>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-700">
              <span className="font-medium">{usuario.nombre}</span>{" "}
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                {NOMBRE_ROL[usuario.rol] || usuario.rol}
              </span>
            </span>
            <button
              type="button"
              onClick={salir}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav aria-label="Principal" className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 pb-2">
          {enlaces.map((e) => (
            <NavLink
              key={e.a}
              to={e.a}
              end
              className={({ isActive }) =>
                `${enlaceBase} ${isActive ? "bg-emerald-800 text-white" : "text-slate-800 hover:bg-emerald-50"}`
              }
            >
              {e.texto}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
