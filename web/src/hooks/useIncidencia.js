import { useCallback, useEffect, useState } from "react";
import { api } from "../api/cliente.js";

// Carga el expediente `GET /incidencias/:codigo`. Cancela la petición anterior
// con AbortController al cambiar de código o al desmontar.
// `recargar()` vuelve a pedir los datos sin vaciar la pantalla (lo usará F06).
export function useIncidencia(codigo) {
  const [estado, setEstado] = useState({ cargando: true, error: null, incidencia: null });
  const [intento, setIntento] = useState(0);

  // Al cambiar de código se descarta el expediente anterior.
  useEffect(() => {
    setEstado({ cargando: true, error: null, incidencia: null });
  }, [codigo]);

  useEffect(() => {
    const control = new AbortController();
    api
      .get(`/incidencias/${encodeURIComponent(codigo)}`, control.signal)
      .then((doc) => {
        if (control.signal.aborted) return;
        setEstado({ cargando: false, error: null, incidencia: doc });
      })
      .catch((e) => {
        if (e?.name === "AbortError" || control.signal.aborted) return;
        setEstado({ cargando: false, error: e, incidencia: null });
      });
    return () => control.abort();
  }, [codigo, intento]);

  // Tras un error muestra "cargando"; si ya hay datos los conserva mientras recarga.
  const recargar = useCallback(() => {
    setEstado((e) => (e.incidencia ? e : { cargando: true, error: null, incidencia: null }));
    setIntento((n) => n + 1);
  }, []);

  return { ...estado, recargar };
}
