import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSesion } from "../auth/SesionContext.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import Icono from "../components/Iconos.jsx";
import Marca from "../components/Marca.jsx";

// Puntos que explican el sistema en el panel de marca (solo escritorio).
const PUNTOS = [
  { icono: "lista", texto: "Reporta cualquier falla del campus y da seguimiento hasta su cierre." },
  { icono: "clip", texto: "Adjunta fotos o PDF como evidencia, guardados de forma privada." },
  { icono: "grafica", texto: "Tiempos de resolución y fallas recurrentes por edificio." },
];

export default function Login() {
  const { usuario, iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión, no tiene sentido mostrar el login.
  if (usuario) return <Navigate to="/incidencias" replace />;

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(correo.trim(), password);
      navigate(ubicacion.state?.desde?.pathname || "/incidencias", { replace: true });
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden bg-marca-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <img src="/logo-utm-rombo-marca.png" alt="" aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 opacity-60" />
        <img src="/logo-utm-rombo-marca.png" alt="" aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-20 size-80 rotate-12 opacity-50" />
        <img src="/logo-utm-rombo-lima.png" alt="" aria-hidden="true"
          className="pointer-events-none absolute bottom-24 right-16 size-20 opacity-90" />

        <div className="relative flex items-center gap-3">
          <Marca tamano={44} />
          <div className="leading-tight">
            <p className="font-display text-xl font-semibold">UTM Desk</p>
            <p className="text-sm text-marca-200">Universidad Tecnológica Metropolitana</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight">
            Soporte del campus, <span className="text-acento">en un solo lugar</span>
          </h2>
          <ul className="mt-8 space-y-5">
            {PUNTOS.map((p) => (
              <li key={p.icono} className="flex items-start gap-3 text-marca-100">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-acento">
                  <Icono nombre={p.icono} />
                </span>
                <span>{p.texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-marca-300">Bases de Datos en la Nube · Unidad II</p>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Marca tamano={40} />
            <p className="font-display text-xl font-semibold text-marca-900">UTM Desk</p>
          </div>

          <h1 className="font-display text-3xl font-semibold text-slate-900">Inicia sesión</h1>
          <p className="mt-2 text-slate-600">Usa tu correo institucional para reportar o dar seguimiento a incidencias.</p>

          <form onSubmit={enviar} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="correo" className="etiqueta-campo">
                Correo institucional
              </label>
              <input
                id="correo"
                type="email"
                autoComplete="username"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@utmetropolitana.edu.mx"
                className="campo mt-1.5"
              />
            </div>

            <div>
              <label htmlFor="password" className="etiqueta-campo">
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={verPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="campo pr-12"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-pressed={verPassword}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-1 right-1 grid w-10 cursor-pointer place-items-center rounded-md text-marca-700 transition-colors hover:bg-marca-50"
                >
                  <span key={verPassword} className="animacion-ojo grid place-items-center">
                    <Icono nombre={verPassword ? "ojo-cerrado" : "ojo"} tamano={19} />
                  </span>
                </button>
              </div>
            </div>

            {error && <ErrorMensaje error={error} />}

            <button type="submit" disabled={enviando || !correo || !password} className="btn btn-primario w-full min-h-12! text-base!">
              <Icono nombre="entrar" />
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-700">
            ¿No tienes cuenta?{" "}
            <Link to="/registro" className="font-semibold text-marca-700 underline underline-offset-2 hover:text-marca-900">
              Regístrate como reportante
            </Link>
          </p>

          <p className="mt-8 flex items-start gap-2 text-sm text-slate-600">
            <Icono nombre="escudo" tamano={18} className="mt-0.5 text-marca-600" />
            <span>Tu sesión se cierra sola a las 8 horas. En un equipo compartido, recuerda cerrar sesión al terminar.</span>
          </p>
        </div>
      </main>
    </div>
  );
}
