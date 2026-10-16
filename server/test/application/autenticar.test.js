// Pruebas del caso de uso de autenticación con fakes en memoria (sin Express ni Mongo).
import { describe, it, expect, beforeAll } from "vitest";
import bcrypt from "bcryptjs";
import { autenticar } from "../../src/application/autenticar.js";

// La contraseña de prueba se genera al vuelo: no hay secretos en el código.
const PASSWORD = "clave-" + Math.random().toString(36).slice(2);
let caso;

// Fakes de los puertos
const hasher = { comparar: (plano, hash) => bcrypt.compare(plano, hash) };
const tokens = {
  firmar: (p) => "tok:" + JSON.stringify(p),
  verificar: (t) => {
    if (!t.startsWith("tok:")) throw new Error("token inválido");
    return JSON.parse(t.slice(4));
  },
};

beforeAll(async () => {
  const hash = await bcrypt.hash(PASSWORD, 4);
  const usuarios = [
    { _id: "u1", nombre: "Ana", correo: "ana@utm.mx", rol: "reportante", tipo: "docente", password_hash: hash, activo: true },
    { _id: "u2", nombre: "Luis", correo: "luis@utm.mx", rol: "tecnico", password_hash: hash, activo: true },
    { _id: "u3", nombre: "Baja", correo: "baja@utm.mx", rol: "tecnico", password_hash: hash, activo: false },
  ];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
  };
  caso = autenticar({ usuariosRepo, hasher, tokens });
});

// Devuelve el error lanzado (o null si no hubo).
async function error(promesa) {
  try {
    await promesa;
  } catch (e) {
    return e;
  }
  return null;
}

describe("login", () => {
  it("devuelve token y usuario sin password_hash", async () => {
    const r = await caso.login("ana@utm.mx", PASSWORD);
    expect(r.token).toBeTypeOf("string");
    expect(r.usuario).toEqual({ id: "u1", nombre: "Ana", correo: "ana@utm.mx", rol: "reportante", tipo: "docente" });
    expect(JSON.stringify(r)).not.toContain("password_hash");
  });

  it("omite tipo si no existe (sin null)", async () => {
    const r = await caso.login("luis@utm.mx", PASSWORD);
    expect("tipo" in r.usuario).toBe(false);
  });

  it("normaliza el correo (trim y minúsculas)", async () => {
    const r = await caso.login("  ANA@UTM.MX ", PASSWORD);
    expect(r.usuario.correo).toBe("ana@utm.mx");
  });

  it("inexistente, inactivo y contraseña mala dan el MISMO error", async () => {
    const e1 = await error(caso.login("nadie@utm.mx", PASSWORD));
    const e2 = await error(caso.login("baja@utm.mx", PASSWORD));
    const e3 = await error(caso.login("ana@utm.mx", "incorrecta"));
    for (const e of [e1, e2, e3]) expect(e?.codigo).toBe("CREDENCIALES_INVALIDAS");
    expect(e1.message).toBe(e2.message);
    expect(e2.message).toBe(e3.message);
  });
});

describe("usuarioDesdeToken", () => {
  it("devuelve el usuario vigente a partir de un token válido", async () => {
    const { token } = await caso.login("luis@utm.mx", PASSWORD);
    const u = await caso.usuarioDesdeToken(token);
    expect(u.id).toBe("u2");
    expect(JSON.stringify(u)).not.toContain("password_hash");
  });

  it("falla con NO_AUTENTICADO si el token es inválido", async () => {
    const e = await error(caso.usuarioDesdeToken("basura"));
    expect(e?.codigo).toBe("NO_AUTENTICADO");
  });

  it("falla si el usuario fue desactivado después de emitir el token", async () => {
    const t = tokens.firmar({ sub: "u3", rol: "tecnico", nombre: "Baja" });
    const e = await error(caso.usuarioDesdeToken(t));
    expect(e?.codigo).toBe("NO_AUTENTICADO");
  });
});
