import { useCallback, useEffect, useState } from "react";
import { api } from "../api/cliente.js";

// Carga la lista (o la búsqueda) según `ruta`. Cancela la petición anterior con
// AbortController para que una respuesta lenta no pise a una más reciente.
export function useListaIncidencias(ruta) {
  const [estado, setEstado] = useState({ cargando: true, error: null, datos: [], total: 0 });
  const [intento, setIntento] = useState(0); // sube al pulsar "Reintentar"

  useEffect(() => {
    const control = new AbortController();
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    api
      .get(ruta, control.signal)
      .then((r) => {
        if (control.signal.aborted) return;
        const datos = r.datos || [];
        setEstado({ cargando: false, error: null, datos, total: r.total ?? datos.length });
      })
      .catch((e) => {
        if (e?.name === "AbortError" || control.signal.aborted) return;
        setEstado({ cargando: false, error: e, datos: [], total: 0 });
      });
    return () => control.abort();
  }, [ruta, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { ...estado, reintentar };
}
