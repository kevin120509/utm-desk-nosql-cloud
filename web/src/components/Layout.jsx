import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSesion } from "../auth/SesionContext.jsx";
import { ROLES_CREAR, ROLES_ANALITICA, NOMBRE_ROL } from "../auth/permisos.js";
import Icono from "./Iconos.jsx";
import Marca from "./Marca.jsx";

const iniciales = (nombre = "") =>
  nombre
    .replace(/^(Mtra?\.|Dra?\.|Ing\.|Lic\.)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

// Enlace del menú: fondo claro translúcido y barra lima cuando está activo.
function EnlaceMenu({ a, icono, texto, alNavegar }) {
  return (
    <NavLink
      to={a}
      end
      onClick={alNavegar}
      className={({ isActive }) =>
        `group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] font-medium transition-colors duration-150 ${
          isActive ? "bg-white/12 text-white" : "text-marca-100 hover:bg-white/8 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden="true" className="absolute inset-y-2 -left-3 w-1 rounded-r bg-acento" />}
          <Icono nombre={icono} />
          <span>{texto}</span>
        </>
      )}
    </NavLink>
  );
}

// Marco común: barra lateral (escritorio) o menú desplegable (móvil), y contenido.
export default function Layout() {
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [abierto, setAbierto] = useState(false);

  // Al cambiar de página se cierra el menú móvil.
  useEffect(() => setAbierto(false), [ubicacion.pathname]);

  // Menú según el rol (plan §5).
  const enlaces = [{ a: "/incidencias", icono: "lista", texto: "Incidencias" }];
  if (ROLES_CREAR.includes(usuario.rol)) enlaces.push({ a: "/incidencias/nueva", icono: "mas", texto: "Nueva incidencia" });
  if (ROLES_ANALITICA.includes(usuario.rol)) enlaces.push({ a: "/analitica", icono: "grafica", texto: "Analítica" });

  function salir() {
    cerrarSesion();
    navigate("/login", { replace: true });
  }

  const menu = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <Marca />
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold text-white">UTM Desk</p>
          <p className="text-xs text-marca-200">Soporte del campus</p>
        </div>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-1 px-3">
        {enlaces.map((e) => (
          <EnlaceMenu key={e.a} {...e} alNavegar={() => setAbierto(false)} />
        ))}
      </nav>

      <div className="m-3 rounded-xl bg-white/8 p-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-acento font-display text-sm font-semibold text-marca-950"
          >
            {iniciales(usuario.nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{usuario.nombre}</p>
            <p className="text-xs text-marca-200">{NOMBRE_ROL[usuario.rol] || usuario.rol}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={salir}
          className="btn btn-fantasma mt-3 w-full justify-start text-marca-100! hover:bg-white/10! hover:text-white!"
        >
          <Icono nombre="salir" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-marca-800 focus:shadow-elevada"
      >
        Saltar al contenido
      </a>

      {/* Barra lateral fija (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto bg-marca-900 lg:block">{menu}</aside>

      {/* Barra superior y menú desplegable (móvil) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-marca-900 px-4 py-2.5 lg:hidden">
        <div className="flex items-center gap-2.5">
          <Marca tamano={32} />
          <span className="font-display font-semibold text-white">UTM Desk</span>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          className="btn btn-fantasma text-white! hover:bg-white/10!"
        >
          <Icono nombre={abierto ? "cerrar" : "menu"} />
          <span>{abierto ? "Cerrar" : "Menú"}</span>
        </button>
      </header>
      {abierto && (
        <div id="menu-movil" className="fixed inset-x-0 bottom-0 top-[3.5rem] z-20 overflow-y-auto bg-marca-900 lg:hidden [&>div>div:first-child]:hidden">
          {menu}
        </div>
      )}

      <main id="contenido" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
