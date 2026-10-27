// Registro público: crea una cuenta de reportante. El servidor fija el rol; aquí nunca se envía.
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/cliente.js";
import { useSesion } from "../auth/SesionContext.jsx";
import Campo from "../components/Campo.jsx";
import ErrorMensaje from "../components/ErrorMensaje.jsx";
import Icono from "../components/Iconos.jsx";
import Marca from "../components/Marca.jsx";

const TIPOS = [
  { valor: "docente", texto: "Docente" },
  { valor: "estudiante", texto: "Estudiante" },
  { valor: "administrativo", texto: "Administrativo" },
];

export default function Registro() {
  const { usuario, iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const [f, setF] = useState({ nombre: "", correo: "", password: "", confirmar: "", tipo: "" });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/incidencias" replace />;

  const set = (campo) => (e) => setF((v) => ({ ...v, [campo]: e.target.value }));

  function validar() {
    const e = {};
    if (f.nombre.trim().length < 2) e.nombre = "Escribe tu nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(f.correo.trim())) e.correo = "Escribe un correo válido.";
    if (f.password.length < 8) e.password = "La contraseña debe tener al menos 8 caracteres.";
    if (f.confirmar !== f.password) e.confirmar = "Las contraseñas no coinciden.";
    if (!f.tipo) e.tipo = "Indica si eres docente, estudiante o administrativo.";
    return e;
  }

  async function enviar(ev) {
    ev.preventDefault();
    setErrorGeneral(null);
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      await api.post("/auth/registro", { nombre: f.nombre.trim(), correo: f.correo.trim(), password: f.password, tipo: f.tipo });
      await iniciarSesion(f.correo.trim(), f.password);
      navigate("/incidencias", { replace: true });
    } catch (err) {
      if (err.detalles && typeof err.detalles === "object" && !Array.isArray(err.detalles)) setErrores(err.detalles);
      setErrorGeneral(err);
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <Marca tamano={40} />
          <p className="font-display text-xl font-semibold text-marca-900">UTM Desk</p>
        </div>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Crea tu cuenta</h1>
        <p className="mt-2 text-slate-600">Con tu cuenta podrás reportar fallas del campus y dar seguimiento a tus incidencias.</p>

        <form onSubmit={enviar} className="mt-8 space-y-5" noValidate>
          <Campo id="nombre" etiqueta="Nombre completo" requerido error={errores.nombre}>
            {(p) => <input {...p} type="text" autoComplete="name" value={f.nombre} onChange={set("nombre")} />}
          </Campo>
          <Campo id="correo" etiqueta="Correo" requerido error={errores.correo}>
            {(p) => <input {...p} type="email" autoComplete="email" value={f.correo} onChange={set("correo")} placeholder="nombre@utmetropolitana.edu.mx" />}
          </Campo>
          <Campo id="tipo" etiqueta="Tipo de persona" requerido error={errores.tipo}>
            {(p) => (
              <select {...p} value={f.tipo} onChange={set("tipo")}>
                <option value="">Selecciona…</option>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.texto}</option>
                ))}
              </select>
            )}
          </Campo>
          <Campo id="password" etiqueta="Contraseña" requerido ayuda="Mínimo 8 caracteres." error={errores.password}>
            {(p) => <input {...p} type="password" autoComplete="new-password" value={f.password} onChange={set("password")} />}
          </Campo>
          <Campo id="confirmar" etiqueta="Confirma la contraseña" requerido error={errores.confirmar}>
            {(p) => <input {...p} type="password" autoComplete="new-password" value={f.confirmar} onChange={set("confirmar")} />}
          </Campo>

          {errorGeneral && <ErrorMensaje error={errorGeneral} />}

          <button type="submit" disabled={enviando} className="btn btn-primario w-full min-h-12! text-base!">
            <Icono nombre="entrar" />
            {enviando ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-700">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-semibold text-marca-700 underline underline-offset-2 hover:text-marca-900">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
