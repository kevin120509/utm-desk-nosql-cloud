import { describe, it, expect } from "vitest";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

describe("tokens JWT", () => {
  it("falla claro si falta JWT_SECRET", () => {
    expect(() => crearTokens({ secret: "" })).toThrow(/JWT_SECRET/);
  });

  it("firma y verifica el payload", () => {
    const t = crearTokens({ secret: "s", expiresIn: "1h" });
    const p = t.verificar(t.firmar({ sub: "1", rol: "tecnico", nombre: "X" }));
    expect(p.sub).toBe("1");
    expect(p.rol).toBe("tecnico");
  });
});
