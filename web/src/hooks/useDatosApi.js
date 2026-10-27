import { useCallback, useEffect, useState } from "react";
import { api } from "../api/cliente.js";

// Pide una ruta a la API y devuelve `{ cargando, error, datos, recargar }`.
// - Si `ruta` es null no hace nada (útil para un detalle que aún no se ha elegido).
// - Al recargar la MISMA ruta se conservan los datos anteriores (no desmonta la vista).
// - Al cambiar de ruta no se muestran datos de la anterior.
// Cancela la petición anterior con AbortController.
export function useDatosApi(ruta) {
  const [estado, setEstado] = useState({ cargando: true, error: null, datos: null, ruta: null });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!ruta) return;
    const control = new AbortController();
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    api
      .get(ruta, control.signal)
      .then((datos) => {
        if (!control.signal.aborted) setEstado({ cargando: false, error: null, datos, ruta });
      })
      .catch((e) => {
        if (e?.name === "AbortError" || control.signal.aborted) return;
        setEstado({ cargando: false, error: e, datos: null, ruta });
      });
    return () => control.abort();
  }, [ruta, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);
  const mismaRuta = ruta !== null && estado.ruta === ruta;
  return {
    cargando: estado.cargando,
    error: mismaRuta ? estado.error : null,
    datos: mismaRuta ? estado.datos : null,
    recargar,
  };
}
