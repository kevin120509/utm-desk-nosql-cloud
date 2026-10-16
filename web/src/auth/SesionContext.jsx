import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/cliente.js";
import { leerSesion, guardarSesion, borrarSesion } from "./almacen.js";

const SesionContext = createContext(null);

// Proveedor de sesión: usuario, token, iniciarSesion, cerrarSesion y cargando.
export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(() => leerSesion());
  const [cargando, setCargando] = useState(() => leerSesion() !== null);

  // Al arrancar con token guardado, se valida con GET /auth/me.
  useEffect(() => {
    const guardada = leerSesion();
    if (!guardada) return;
    let activo = true;
    api
      .get("/auth/me")
      .then(({ usuario }) => {
        if (!activo) return;
        const nueva = { token: guardada.token, usuario };
        guardarSesion(nueva);
        setSesion(nueva);
      })
      .catch((e) => {
        // Solo se descarta la sesión si el token es inválido; un fallo de red la conserva.
        if (activo && e.status === 401) {
          borrarSesion();
          setSesion(null);
        }
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, []);

  async function iniciarSesion(correo, password) {
    const { token, usuario } = await api.post("/auth/login", { correo, password });
    const nueva = { token, usuario };
    guardarSesion(nueva);
    setSesion(nueva);
    return usuario;
  }

  function cerrarSesion() {
    borrarSesion();
    setSesion(null);
  }

  const valor = {
    usuario: sesion?.usuario ?? null,
    token: sesion?.token ?? null,
    cargando,
    iniciarSesion,
    cerrarSesion,
  };
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de SesionProvider");
  return ctx;
}
