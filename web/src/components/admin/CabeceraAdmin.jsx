import { NavLink } from "react-router-dom";
import Icono from "../Iconos.jsx";

// Secciones del módulo admin (/admin/*). El orden es el del menú.
const SECCIONES = [
  { a: "/admin", texto: "Inicio" },
  { a: "/admin/usuarios", texto: "Usuarios" },
  { a: "/admin/roles", texto: "Roles" },
  { a: "/admin/catalogos", texto: "Catálogos" },
  { a: "/admin/incidencias", texto: "Incidencias" },
  { a: "/admin/bitacora", texto: "Bitácora" },
  { a: "/admin/metricas", texto: "Métricas" },
  { a: "/admin/sistema", texto: "Sistema" },
];

// Encabezado de cada página del módulo: título, descripción y pestañas de navegación.
export default function CabeceraAdmin({ titulo, descripcion }) {
  return (
    <header className="mb-6">
      <p className="flex items-center gap-2 text-sm font-medium text-marca-700">
        <Icono nombre="escudo" tamano={18} />
        Administración
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900 sm:text-3xl">{titulo}</h1>
      {descripcion && <p className="mt-1 max-w-3xl text-slate-600">{descripcion}</p>}
      <nav aria-label="Secciones de administración" className="mt-4 -mx-1 flex gap-1 overflow-x-auto pb-1">
        {SECCIONES.map((s) => (
          <NavLink
            key={s.a}
            to={s.a}
            end
            className={({ isActive }) =>
              `shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-marca-700 text-white" : "text-slate-700 hover:bg-marca-50"
              }`
            }
          >
            {s.texto}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
