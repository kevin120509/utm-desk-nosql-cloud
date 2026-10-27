// Pruebas HTTP del rol superAdmin y del registro público, con repositorios falsos en memoria.
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { gestionarUsuarios } from "../../src/application/gestionarUsuarios.js";
import { registrarUsuario } from "../../src/application/registrarUsuario.js";
import { administrar } from "../../src/application/administrar.js";
import { crearAuditor } from "../../src/application/auditoria.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const SECRET = "secreto-" + Math.random().toString(36).slice(2);
const CLAVE = "Clave-de-prueba-" + Math.random().toString(36).slice(2, 8);
const hasher = { comparar: bcrypt.compare, hashear: (p) => bcrypt.hash(p, 4) };

let app, tokens, usuarios, bitacora, ids, hashBase;

function repoUsuarios() {
  return {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
    listar: async ({ rol, activo }) => {
      let datos = usuarios.filter((u) => (!rol || u.rol === rol) && (activo === undefined || (u.activo !== false) === activo));
      return { datos: datos.map(({ password_hash, ...r }) => r), total: datos.length };
    },
    insertar: async (doc) => {
      if (usuarios.some((u) => u.correo === doc.correo)) throw Object.assign(new Error("dup"), { codigo: "CORREO_DUPLICADO" });
      const nuevo = { ...doc, _id: new ObjectId() };
      usuarios.push(nuevo);
      return nuevo;
    },
    actualizar: async (id, cambios) => {
      const u = usuarios.find((x) => String(x._id) === String(id));
      if (!u) return false;
      Object.assign(u, cambios.$set ?? {});
      for (const k of Object.keys(cambios.$unset ?? {})) delete u[k];
      return true;
    },
    contarSuperAdminsActivos: async () => usuarios.filter((u) => u.rol === "superAdmin" && u.activo !== false).length,
  };
}

beforeAll(async () => {
  hashBase = await bcrypt.hash(CLAVE, 4);
});

beforeEach(() => {
  ids = { adm: new ObjectId(), adm2: new ObjectId(), rep: new ObjectId(), tec: new ObjectId() };
  const mk = (_id, rol, extra = {}) => ({ _id, nombre: rol, correo: `${rol}${String(_id).slice(-4)}@utm.mx`, rol, password_hash: hashBase, activo: true, ...extra });
  usuarios = [mk(ids.adm, "superAdmin"), mk(ids.rep, "reportante", { tipo: "docente" }), mk(ids.tec, "tecnico")];
  bitacora = [];
  const bitacoraRepo = {
    registrar: async (e) => void bitacora.push(e),
    listar: async ({ tipo }) => {
      const datos = bitacora.filter((e) => !tipo || e.tipo === tipo).map((e, i) => ({ _id: new ObjectId(), ...e }));
      return { datos, total: datos.length };
    },
  };
  const t = crearTokens({ secret: SECRET, expiresIn: "1h" });
  const usuariosRepo = repoUsuarios();
  const auth = autenticar({ usuariosRepo, hasher, tokens: t });
  const auditor = crearAuditor({ bitacoraRepo });
  app = crearApp({
    auth,
    auditor,
    admin: {
      usuarios: gestionarUsuarios({ usuariosRepo, hasher, auditor }),
      administrar: administrar({
        bitacoraRepo,
        adminRepo: { ping: async () => 3, resumen: async () => ({ usuarios: { total: usuarios.length }, incidencias: { total: 0 } }) },
        almacen: { salud: async () => ({ ok: true, detalle: "bucket" }) },
      }),
    },
    registro: registrarUsuario({ usuariosRepo, hasher, auditor }),
  });
  tokens = {
    adm: t.firmar({ sub: String(ids.adm), rol: "superAdmin", nombre: "x" }),
    rep: t.firmar({ sub: String(ids.rep), rol: "reportante", nombre: "x" }),
    tec: t.firmar({ sub: String(ids.tec), rol: "tecnico", nombre: "x" }),
  };
});

const como = (quien) => ({ Authorization: `Bearer ${tokens[quien]}` });
const acciones = () => bitacora.map((e) => e.accion);

describe("autorización del panel de administración", () => {
  it("sin token responde 401", async () => {
    expect((await request(app).get("/api/admin/usuarios")).status).toBe(401);
  });

  it.each(["rep", "tec"])("%s recibe 403 en cada ruta de /api/admin y queda en la bitácora de seguridad", async (quien) => {
    for (const ruta of ["/usuarios", "/bitacora", "/seguridad", "/salud", "/resumen"]) {
      expect((await request(app).get(`/api/admin${ruta}`).set(como(quien))).status).toBe(403);
    }
    expect((await request(app).post("/api/admin/usuarios").set(como(quien)).send({})).status).toBe(403);
    expect(acciones().filter((a) => a === "acceso.denegado").length).toBe(6);
  });

  it("el superAdmin entra a todo y /me devuelve sus permisos", async () => {
    for (const ruta of ["/usuarios", "/bitacora", "/seguridad", "/salud", "/resumen"]) {
      expect((await request(app).get(`/api/admin${ruta}`).set(como("adm"))).status).toBe(200);
    }
    const me = await request(app).get("/api/auth/me").set(como("adm"));
    expect(me.body.usuario.permisos).toContain("usuarios.gestionar");
  });

  it("un superAdmin suspendido pierde el acceso aunque su token siga vigente", async () => {
    usuarios.find((u) => u._id === ids.adm).activo = false;
    expect((await request(app).get("/api/admin/usuarios").set(como("adm"))).status).toBe(401);
  });

  it("un token con rol superAdmin falso no sirve: el rol sale de la base", async () => {
    const falso = crearTokens({ secret: SECRET, expiresIn: "1h" }).firmar({ sub: String(ids.rep), rol: "superAdmin", nombre: "x" });
    expect((await request(app).get("/api/admin/usuarios").set({ Authorization: `Bearer ${falso}` })).status).toBe(403);
  });
});

describe("gestión de usuarios y roles", () => {
  it("crea un técnico con la contraseña hasheada, sin devolverla, y lo registra en la bitácora", async () => {
    const r = await request(app).post("/api/admin/usuarios").set(como("adm")).send({ nombre: "Nuevo Tec", correo: "Nuevo@UTM.mx", password: "12345678", rol: "tecnico" });
    expect(r.status).toBe(201);
    expect(JSON.stringify(r.body)).not.toMatch(/password|hash/i);
    const guardado = usuarios.find((u) => u.correo === "nuevo@utm.mx");
    expect(guardado.password_hash).not.toBe("12345678");
    expect(await bcrypt.compare("12345678", guardado.password_hash)).toBe(true);
    expect(acciones()).toContain("usuario.crear");
  });

  it("rechaza correo repetido (409), contraseña corta (400) y reportante sin tipo (400)", async () => {
    const base = { nombre: "Alguien", correo: "otro@utm.mx", password: "12345678", rol: "tecnico" };
    await request(app).post("/api/admin/usuarios").set(como("adm")).send(base);
    expect((await request(app).post("/api/admin/usuarios").set(como("adm")).send(base)).status).toBe(409);
    expect((await request(app).post("/api/admin/usuarios").set(como("adm")).send({ ...base, correo: "c@utm.mx", password: "123" })).status).toBe(400);
    expect((await request(app).post("/api/admin/usuarios").set(como("adm")).send({ ...base, correo: "d@utm.mx", rol: "reportante" })).status).toBe(400);
  });

  it("cambia el rol de otro usuario y lo deja en la bitácora con el antes y el después", async () => {
    const r = await request(app).patch(`/api/admin/usuarios/${ids.tec}/rol`).set(como("adm")).send({ rol: "coordinador" });
    expect(r.status).toBe(200);
    expect(r.body.usuario.rol).toBe("coordinador");
    const ev = bitacora.find((e) => e.accion === "usuario.cambiar_rol");
    expect(ev.detalle).toEqual({ de: "tecnico", a: "coordinador" });
    expect(ev.actor.id).toBe(String(ids.adm));
  });

  it("no puede cambiarse su propio rol", async () => {
    const r = await request(app).patch(`/api/admin/usuarios/${ids.adm}/rol`).set(como("adm")).send({ rol: "tecnico" });
    expect(r.status).toBe(403);
    expect(usuarios.find((u) => u._id === ids.adm).rol).toBe("superAdmin");
  });

  it("no puede suspenderse a sí mismo", async () => {
    const r = await request(app).patch(`/api/admin/usuarios/${ids.adm}/estado`).set(como("adm")).send({ activo: false });
    expect(r.status).toBe(403);
    expect(usuarios.find((u) => u._id === ids.adm).activo).toBe(true);
  });

  it("el último superAdmin activo no se puede degradar aunque otro (sin sesión válida) lo intente", async () => {
    // Se simula directamente el caso de uso: sólo ids.adm queda activo y otro actor intenta degradarlo.
    const usuariosRepo = repoUsuarios();
    const auditor = crearAuditor({ bitacoraRepo: { registrar: async () => {} } });
    const caso = gestionarUsuarios({ usuariosRepo, hasher, auditor });
    await expect(caso.cambiarRol({ id: String(new ObjectId()) }, ids.adm, { rol: "tecnico" })).rejects.toMatchObject({ codigo: "CONFLICTO" });
    await expect(caso.cambiarEstado({ id: String(new ObjectId()) }, ids.adm, { activo: false })).rejects.toMatchObject({ codigo: "CONFLICTO" });
  });

  it("suspende y reactiva un usuario; el suspendido ya no puede iniciar sesión", async () => {
    expect((await request(app).patch(`/api/admin/usuarios/${ids.rep}/estado`).set(como("adm")).send({ activo: false })).status).toBe(200);
    const login = await request(app).post("/api/auth/login").send({ correo: usuarios.find((u) => u._id === ids.rep).correo, password: CLAVE });
    expect(login.status).toBe(401);
    await request(app).patch(`/api/admin/usuarios/${ids.rep}/estado`).set(como("adm")).send({ activo: true });
    const otra = await request(app).post("/api/auth/login").send({ correo: usuarios.find((u) => u._id === ids.rep).correo, password: CLAVE });
    expect(otra.status).toBe(200);
    expect(acciones()).toEqual(expect.arrayContaining(["usuario.suspender", "usuario.activar"]));
  });

  it("no existe ninguna ruta para borrar usuarios ni la bitácora", async () => {
    expect((await request(app).delete(`/api/admin/usuarios/${ids.rep}`).set(como("adm"))).status).toBe(404);
    expect((await request(app).delete("/api/admin/bitacora").set(como("adm"))).status).toBe(404);
    expect((await request(app).post("/api/admin/bitacora").set(como("adm")).send({})).status).toBe(404);
  });
});

describe("registro público", () => {
  const datos = { nombre: "Nueva Persona", correo: "Nueva@UTM.mx", password: "12345678", tipo: "estudiante" };

  it("crea siempre un reportante activo, sin devolver el hash", async () => {
    const r = await request(app).post("/api/auth/registro").send(datos);
    expect(r.status).toBe(201);
    expect(r.body.usuario.rol).toBe("reportante");
    expect(JSON.stringify(r.body)).not.toMatch(/password|hash/i);
    expect(usuarios.at(-1).activo).toBe(true);
    expect(acciones()).toContain("usuario.registro");
  });

  it("no acepta rol ni permisos en el cuerpo (nadie se registra como superAdmin)", async () => {
    for (const extra of [{ rol: "superAdmin" }, { roles: ["superAdmin"] }, { permisos: ["usuarios.gestionar"] }, { activo: true }]) {
      const r = await request(app).post("/api/auth/registro").send({ ...datos, ...extra });
      expect(r.status).toBe(400);
    }
    expect(usuarios.length).toBe(3);
  });

  it("valida correo, contraseña corta y correo repetido", async () => {
    expect((await request(app).post("/api/auth/registro").send({ ...datos, correo: "no-es-correo" })).status).toBe(400);
    expect((await request(app).post("/api/auth/registro").send({ ...datos, password: "corta" })).status).toBe(400);
    await request(app).post("/api/auth/registro").send(datos);
    expect((await request(app).post("/api/auth/registro").send(datos)).status).toBe(409);
  });

  it("la cuenta nueva puede iniciar sesión", async () => {
    await request(app).post("/api/auth/registro").send(datos);
    const r = await request(app).post("/api/auth/login").send({ correo: "nueva@utm.mx", password: "12345678" });
    expect(r.status).toBe(200);
    expect(r.body.usuario.rol).toBe("reportante");
  });
});

describe("bitácora y seguridad", () => {
  it("registra login correcto y fallido (sin guardar la contraseña)", async () => {
    const correo = usuarios[1].correo;
    await request(app).post("/api/auth/login").send({ correo, password: "mala-contraseña" });
    await request(app).post("/api/auth/login").send({ correo, password: CLAVE });
    expect(acciones()).toEqual(["login.fallido", "login.ok"]);
    expect(JSON.stringify(bitacora)).not.toContain("mala-contraseña");
    expect(JSON.stringify(bitacora)).not.toContain(CLAVE);
  });

  it("el superAdmin consulta la bitácora filtrada por tipo y la salud del sistema", async () => {
    await request(app).patch(`/api/admin/usuarios/${ids.tec}/estado`).set(como("adm")).send({ activo: false });
    const admin = await request(app).get("/api/admin/bitacora").set(como("adm"));
    expect(admin.body.datos.map((e) => e.accion)).toEqual(["usuario.suspender"]);
    const salud = await request(app).get("/api/admin/salud").set(como("adm"));
    expect(salud.body).toMatchObject({ api: { ok: true }, mongo: { ok: true }, almacenamiento: { ok: true } });
  });

  it("si Mongo falla, la salud lo reporta sin tumbar el panel", async () => {
    const auditor = crearAuditor({ bitacoraRepo: { registrar: async () => {} } });
    const caso = administrar({
      bitacoraRepo: {},
      adminRepo: { ping: async () => { throw new Error("sin conexión"); } },
      almacen: {},
    });
    const s = await caso.salud();
    expect(s.mongo.ok).toBe(false);
    expect(s.almacenamiento.ok).toBe(false);
    expect(auditor).toBeTruthy();
  });
});
