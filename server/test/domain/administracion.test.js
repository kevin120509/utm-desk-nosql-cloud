// Esquemas del módulo admin propios de la integración: vista de incidencias y escape de regex.
import { describe, it, expect } from "vitest";
import { adminIncidenciasQuerySchema } from "../../src/domain/administracion.js";
import { regexSeguro } from "../../src/infrastructure/mongo/regex.js";

describe("adminIncidenciasQuerySchema", () => {
  it("acepta la búsqueda q y las categorías nuevas, recortando espacios", () => {
    const q = adminIncidenciasQuerySchema.parse({ q: "  filtracion ", categoria: "infraestructura_fisica" });
    expect(q.q).toBe("filtracion");
    expect(q.categoria).toBe("infraestructura_fisica");
  });

  it("rechaza categorías inexistentes y parámetros extra", () => {
    expect(() => adminIncidenciasQuerySchema.parse({ categoria: "otra_categoria" })).toThrow();
    expect(() => adminIncidenciasQuerySchema.parse({ foo: 1 })).toThrow();
  });
});

describe("regexSeguro", () => {
  it("escapa los metacaracteres: la búsqueda es texto literal", () => {
    expect("a.b(c".match(regexSeguro("a.b(c"))).not.toBeNull();
    expect("axb".match(regexSeguro("a.b"))).toBeNull();
  });
});
