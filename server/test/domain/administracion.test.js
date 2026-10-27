// Reglas del módulo admin (superAdmin): permisos por rol y validación de entradas.
import { describe, it, expect } from "vitest";
import { ROLES } from "../../src/domain/enumeraciones.js";
import {
  PERMISOS,
  permisosDeRol,
  cambiarEstadoUsuarioSchema,
  cambiarRolUsuarioSchema,
  adminUsuariosQuerySchema,
  adminIncidenciasQuerySchema,
} from "../../src/domain/administracion.js";
import { regexSeguro } from "../../src/infrastructure/mongo/regex.js";

describe("permisos por rol", () => {
  it("solo superAdmin tiene permisos administrativos", () => {
    expect(permisosDeRol("superAdmin")).toEqual(PERMISOS);
    for (const rol of ROLES.filter((r) => r !== "superAdmin")) {
      expect(permisosDeRol(rol)).toEqual([]);
    }
  });

  it("superAdmin es un rol válido", () => {
    expect(ROLES).toContain("superAdmin");
  });
});

describe("cambiarEstadoUsuarioSchema", () => {
  it("acepta solo booleanos", () => {
    expect(cambiarEstadoUsuarioSchema.parse({ activo: false })).toEqual({ activo: false });
    expect(() => cambiarEstadoUsuarioSchema.parse({ activo: "no" })).toThrow();
    expect(() => cambiarEstadoUsuarioSchema.parse({})).toThrow();
  });

  it("rechaza campos extra", () => {
    expect(() => cambiarEstadoUsuarioSchema.parse({ activo: true, rol: "superAdmin" })).toThrow();
  });
});

describe("cambiarRolUsuarioSchema", () => {
  it("reportante exige tipo", () => {
    expect(() => cambiarRolUsuarioSchema.parse({ rol: "reportante" })).toThrow();
    expect(cambiarRolUsuarioSchema.parse({ rol: "reportante", tipo: "docente" })).toEqual({ rol: "reportante", tipo: "docente" });
  });

  it("los demás roles no admiten tipo", () => {
    expect(() => cambiarRolUsuarioSchema.parse({ rol: "tecnico", tipo: "docente" })).toThrow();
    expect(cambiarRolUsuarioSchema.parse({ rol: "superAdmin" })).toEqual({ rol: "superAdmin" });
  });

  it("rechaza roles inexistentes (p. ej. soporteTI, que no se agregó)", () => {
    expect(() => cambiarRolUsuarioSchema.parse({ rol: "soporteTI" })).toThrow();
    expect(() => cambiarRolUsuarioSchema.parse({ rol: "bot" })).toThrow();
  });
});

describe("consultas del módulo admin", () => {
  it("usuarios: página por defecto y activo como booleano", () => {
    expect(adminUsuariosQuerySchema.parse({})).toEqual({ pagina: 1, limite: 10 });
    expect(adminUsuariosQuerySchema.parse({ activo: "false" }).activo).toBe(false);
    expect(() => adminUsuariosQuerySchema.parse({ activo: "tal vez" })).toThrow();
    expect(() => adminUsuariosQuerySchema.parse({ foo: 1 })).toThrow();
  });

  it("incidencias: acepta la búsqueda q y las categorías nuevas", () => {
    const q = adminIncidenciasQuerySchema.parse({ q: "  filtracion ", categoria: "infraestructura_fisica" });
    expect(q.q).toBe("filtracion");
    expect(() => adminIncidenciasQuerySchema.parse({ categoria: "infraestructura" })).toThrow();
  });
});

describe("regexSeguro", () => {
  it("escapa los metacaracteres: la búsqueda es texto literal", () => {
    expect("a.b(c".match(regexSeguro("a.b(c"))).not.toBeNull();
    expect("axb".match(regexSeguro("a.b"))).toBeNull();
  });
});
