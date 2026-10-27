// Catálogos activos que administra el superAdmin (categorías, edificios y sus espacios).
// Si la API falla, se usan los valores fijos de catalogo.js para que reportar nunca se bloquee.
import { useEffect, useState } from "react";
import { api } from "../api/cliente.js";
import { CATEGORIAS, EDIFICIOS } from "../catalogo.js";

const RESPALDO = {
  categorias: Object.entries(CATEGORIAS).map(([clave, nombre]) => ({ clave, nombre })),
  edificios: EDIFICIOS.map((nombre) => ({ nombre, espacios: [] })),
};

export default function useCatalogos() {
  const [catalogos, setCatalogos] = useState(RESPALDO);
  useEffect(() => {
    let vigente = true;
    api
      .get("/catalogos")
      .then((c) => vigente && c?.categorias?.length && c?.edificios?.length && setCatalogos(c))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);
  return catalogos;
}
