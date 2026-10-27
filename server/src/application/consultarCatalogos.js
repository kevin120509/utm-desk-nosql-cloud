// Caso de uso: catálogos del módulo admin (solo lectura).
// Hoy: categorías, prioridades y estados (valores fijos del dominio), edificios usados en
// incidencias y técnicos (usuarios con rol tecnico). Las altas y ediciones de catálogos
// (POST/PATCH) quedan pendientes: requieren decidir dónde se guardan (ver docs del módulo).
import { CATEGORIAS, PRIORIDADES, ESTADOS } from "../domain/enumeraciones.js";
import { vistaUsuario } from "./administrarUsuarios.js";

/**
 * @param {{usuariosRepo: {listarPorRol: (rol: string) => Promise<object[]>},
 *          incidenciasRepo: {edificiosDistintos: () => Promise<string[]>}}} deps
 */
export function consultarCatalogos({ usuariosRepo, incidenciasRepo }) {
  return async function catalogos() {
    const [edificios, tecnicos] = await Promise.all([
      incidenciasRepo.edificiosDistintos(),
      usuariosRepo.listarPorRol("tecnico"),
    ]);
    return {
      categorias: CATEGORIAS,
      prioridades: PRIORIDADES,
      estados: ESTADOS,
      edificios,
      tecnicos: tecnicos.map(vistaUsuario),
    };
  };
}
