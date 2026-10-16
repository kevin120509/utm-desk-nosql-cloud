import { useCallback, useEffect, useState } from "react";
import { api } from "../api/cliente.js";

// Pide una ruta de analítica (`/analitica/edificios` o `/analitica/tags`) y devuelve
// `{ cargando, error, datos, recargar }`. Cada consulta es independiente: si una falla,
// la otra se sigue mostrando. Cancela la petición anterior con AbortController.
export function useConsultaAnalitica(ruta) {
  const [estado, setEstado] = useState({ cargando: true, error: null, datos: null });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    api
      .get(ruta, control.signal)
      .then((respuesta) => {
        if (control.signal.aborted) return;
        setEstado({ cargando: false, error: null, datos: respuesta?.datos ?? [] });
      })
      .catch((e) => {
        if (e?.name === "AbortError" || control.signal.aborted) return;
        setEstado({ cargando: false, error: e, datos: null });
      });
    return () => control.abort();
  }, [ruta, intento]);

  const recargar = useCallback(() => {
    setEstado({ cargando: true, error: null, datos: null });
    setIntento((n) => n + 1);
  }, []);

  return { ...estado, recargar };
}
