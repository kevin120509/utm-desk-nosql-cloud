import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSesion } from "../auth/SesionContext.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";

const campo =
  "mt-1 block w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700";

export default function Login() {
  const { usuario, iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-800">UTM Desk</h1>
        <p className="mt-1 text-sm text-slate-700">
          Inicia sesión para reportar o dar seguimiento a incidencias.
        </p>
        <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="correo" className="text-sm font-medium text-slate-800">
              Correo
            </label>
            <input
              id="correo"
              type="email"
              autoComplete="username"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-slate-800">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={campo}
            />
          </div>
          {error && <ErrorMensaje error={error} />}
          <button
            type="submit"
            disabled={enviando || !correo || !password}
            className="w-full rounded-md bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
