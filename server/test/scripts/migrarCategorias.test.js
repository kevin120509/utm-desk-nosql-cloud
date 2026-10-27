// El validador de transición debe aceptar las claves viejas y nuevas, y el final solo las nuevas.
import { describe, it, expect } from "vitest";
import { validadorTransicion, MAPA } from "../../scripts/migrar-categorias.js";
import { validadorIncidencias } from "../../src/infrastructure/mongo/validador.js";

// Ramas del oneOf que fijan `categoria` (las que eligen el esquema de detalle_especifico).
function ramasCategoria(v) {
  const ramas = [];
  (function recorrer(nodo) {
    if (Array.isArray(nodo)) return nodo.forEach(recorrer);
    if (!nodo || typeof nodo !== "object") return;
    for (const [k, valor] of Object.entries(nodo)) {
      if (k === "oneOf" && Array.isArray(valor)) ramas.push(...valor.filter((r) => r?.properties?.categoria?.enum));
      recorrer(valor);
    }
  })(v);
  return ramas;
}

describe("validador de transición de categorías", () => {
  it("acepta claves viejas y nuevas en `categoria`", () => {
    const e = validadorTransicion().$jsonSchema.properties.categoria.enum;
    for (const [viejo, nuevo] of Object.entries(MAPA)) {
      expect(e).toContain(viejo);
      expect(e).toContain(nuevo);
    }
  });

  it("cada rama nueva acepta también su nombre viejo y conserva el MISMO esquema de detalle", () => {
    const finales = ramasCategoria(validadorIncidencias);
    const transicion = ramasCategoria(validadorTransicion());
    expect(transicion).toHaveLength(finales.length);
    for (const [viejo, nuevo] of Object.entries(MAPA)) {
      const final = finales.find((r) => r.properties.categoria.enum.includes(nuevo));
      const trans = transicion.find((r) => r.properties.categoria.enum.includes(nuevo));
      expect(final).toBeTruthy();
      expect(trans.properties.categoria.enum).toEqual([nuevo, viejo]);
      // El documento viejo se valida con el mismo esquema de detalle que el nuevo.
      expect(trans.properties.detalle_especifico).toEqual(final.properties.detalle_especifico);
    }
    // Ninguna clave vieja queda sin rama (un documento viejo no fallaría el oneOf).
    const aceptadas = transicion.flatMap((r) => r.properties.categoria.enum);
    for (const viejo of Object.keys(MAPA)) expect(aceptadas.filter((c) => c === viejo)).toHaveLength(1);
  });

  it("no modifica el validador final (solo claves nuevas)", () => {
    validadorTransicion();
    const e = validadorIncidencias.$jsonSchema.properties.categoria.enum;
    for (const viejo of Object.keys(MAPA)) {
      expect(e).not.toContain(viejo);
      expect(ramasCategoria(validadorIncidencias).flatMap((r) => r.properties.categoria.enum)).not.toContain(viejo);
    }
  });
});
