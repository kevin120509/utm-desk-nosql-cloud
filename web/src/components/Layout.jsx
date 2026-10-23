import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

// Enlace del menú: fondo claro translúcido cuando está activo; la barra lima
// es compartida y se desliza (ver NavConIndicador).
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
      <Icono nombre={icono} />
      <span>{texto}</span>
    </NavLink>
  );
}

// Menú con indicador deslizante: una sola barra lima que se mueve a la
// pestaña activa midiendo su posición real en el DOM.
function NavConIndicador({ enlaces, alNavegar }) {
  const navRef = useRef(null);
  const { pathname } = useLocation();
  const [indicador, setIndicador] = useState({ top: 0, alto: 0, visible: false });

  useLayoutEffect(() => {
    const activo = navRef.current?.querySelector('[aria-current="page"]');
    setIndicador(
      activo
        ? { top: activo.offsetTop + 8, alto: activo.offsetHeight - 16, visible: true }
        : { top: 0, alto: 0, visible: false },
    );
  }, [pathname, enlaces]);

  return (
    <nav ref={navRef} aria-label="Principal" className="relative flex-1 space-y-1 px-3">
      <span
        aria-hidden="true"
        className={`absolute left-0 w-1 rounded-r bg-acento transition-all duration-300 ease-out ${
          indicador.visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ top: indicador.top, height: indicador.alto }}
      />
      {enlaces.map((e) => (
        <EnlaceMenu key={e.a} {...e} alNavegar={alNavegar} />
      ))}
    </nav>
  );
}

// Marco común: barra lateral (escritorio) o menú desplegable (móvil), y contenido.
export default function Layout() {
  const { usuario, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [cargandoRuta, setCargandoRuta] = useState(false);

  // Al cambiar de página se cierra el menú móvil y se muestra el rombo de carga un momento.
  useEffect(() => {
    setAbierto(false);
    setCargandoRuta(true);
    const t = setTimeout(() => setCargandoRuta(false), 650);
    return () => clearTimeout(t);
  }, [ubicacion.pathname]);

  // Escape cierra la confirmación de cierre de sesión.
  useEffect(() => {
    if (!confirmando || saliendo) return;
    const alTeclar = (e) => e.key === "Escape" && setConfirmando(false);
    window.addEventListener("keydown", alTeclar);
    return () => window.removeEventListener("keydown", alTeclar);
  }, [confirmando, saliendo]);

  // Menú según el rol (plan §5).
  const enlaces = [{ a: "/incidencias", icono: "lista", texto: "Incidencias" }];
  if (ROLES_CREAR.includes(usuario.rol)) enlaces.push({ a: "/incidencias/nueva", icono: "mas", texto: "Nueva incidencia" });
  if (ROLES_ANALITICA.includes(usuario.rol)) enlaces.push({ a: "/analitica", icono: "grafica", texto: "Analítica" });

  function salir() {
    setConfirmando(true);
  }

  async function confirmarSalida() {
    setSaliendo(true);
    await new Promise((r) => setTimeout(r, 1000));
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

      <NavConIndicador enlaces={enlaces} alNavegar={() => setAbierto(false)} />

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
      {/* Menú móvil: cajón lateral izquierdo que desliza; ocupa la mitad de la pantalla. */}
      <div
        aria-hidden="true"
        onClick={() => setAbierto(false)}
        className={`fixed inset-0 top-[3.5rem] z-20 bg-marca-950/50 transition-opacity duration-300 lg:hidden ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        id="menu-movil"
        inert={!abierto}
        className={`fixed bottom-0 left-0 top-[3.5rem] z-30 w-1/2 min-w-56 max-w-72 overflow-y-auto bg-marca-900 shadow-elevada transition-transform duration-300 ease-out lg:hidden ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {menu}
      </div>

      <main id="contenido" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      {/* Velo de carga de marca al cambiar de pestaña (rombo UTM en bucle). */}
      {cargandoRuta && (
        <div className="animacion-opaco fixed inset-0 z-40 grid place-items-center bg-white/60 backdrop-blur-[2px]" role="status" aria-label="Cargando sección">
          <img src="/logo-utm-rombo.png" alt="" draggable={false} onContextMenu={(e) => e.preventDefault()} className="animacion-rombo size-16 select-none" />
        </div>
      )}

      {/* Confirmación de cierre de sesión con animación de aparición. */}
      {confirmando && (
        <div
          className="animacion-opaco fixed inset-0 z-50 grid place-items-center bg-marca-950/60 p-4"
          onClick={() => !saliendo && setConfirmando(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-salir"
            aria-describedby="texto-salir"
            className="animacion-tarjeta w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevada"
            onClick={(e) => e.stopPropagation()}
          >
            {saliendo ? (
              <div className="flex flex-col items-center gap-4 py-4" role="status" aria-label="Cerrando sesión">
                <img src="/logo-utm-rombo.png" alt="" draggable={false} onContextMenu={(e) => e.preventDefault()} className="animacion-rombo size-14 select-none" />
                <p className="text-sm font-semibold text-slate-700">Cerrando sesión…</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-700">
                    <Icono nombre="salir" />
                  </span>
                  <h2 id="titulo-salir" className="font-display text-lg font-semibold text-slate-900">
                    ¿Cerrar sesión?
                  </h2>
                </div>
                <p id="texto-salir" className="mt-3 text-sm text-slate-600">
                  Tu sesión en UTM Desk se cerrará en este dispositivo.
                </p>
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={() => setConfirmando(false)} className="btn btn-secundario flex-1">
                    Cancelar
                  </button>
                  <button type="button" onClick={confirmarSalida} className="btn btn-primario flex-1">
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
