// Pruebas de catálogos (categorías, edificios, espacios) y de técnicos, con repositorios falsos.
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { crearApp } from "../../src/interface/http/app.js";
import { autenticar } from "../../src/application/autenticar.js";
import { gestionarUsuarios } from "../../src/application/gestionarUsuarios.js";
import { gestionarCatalogos } from "../../src/application/gestionarCatalogos.js";
import { administrar } from "../../src/application/administrar.js";
import { crearAuditor } from "../../src/application/auditoria.js";
import { crearTokens } from "../../src/infrastructure/seguridad/jwt.js";

const hasher = { comparar: bcrypt.compare, hashear: (p) => bcrypt.hash(p, 4) };
let app, tokens, usuarios, docs, bitacora, ids, catalogos;

beforeAll(() => {});

beforeEach(async () => {
  const hash = await bcrypt.hash("x" + Math.random(), 4);
  ids = { adm: new ObjectId(), tec: new ObjectId(), rep: new ObjectId() };
  usuarios = [
    { _id: ids.adm, nombre: "adm", correo: "adm@utm.mx", rol: "superAdmin", password_hash: hash, activo: true },
    { _id: ids.tec, nombre: "tec", correo: "tec@utm.mx", rol: "tecnico", password_hash: hash, activo: true },
    { _id: ids.rep, nombre: "rep", correo: "rep@utm.mx", rol: "reportante", tipo: "docente", password_hash: hash, activo: true },
  ];
  docs = [];
  bitacora = [];
  const usuariosRepo = {
    buscarPorCorreo: async (c) => usuarios.find((u) => u.correo === c) ?? null,
    buscarPorId: async (id) => usuarios.find((u) => String(u._id) === String(id)) ?? null,
    listar: async ({ rol }) => ({ datos: usuarios.filter((u) => !rol || u.rol === rol), total: 1 }),
    actualizar: async (id, c) => {
      const u = usuarios.find((x) => String(x._id) === String(id));
      Object.assign(u, c.$set ?? {});
      for (const k of Object.keys(c.$unset ?? {})) delete u[k];
      return true;
    },
    contarSuperAdminsActivos: async () => 2,
  };
  const catalogosRepo = {
    contar: async () => docs.length,
    listar: async () => [...docs],
    sembrar: async (d) => void docs.push(...d.map((x) => ({ _id: new ObjectId(), ...x }))),
    buscarCategoria: async (clave) => docs.find((d) => d.tipo === "categoria" && d.clave === clave) ?? null,
    buscarEdificio: async (id) => docs.find((d) => d.tipo === "edificio" && String(d._id) === String(id)) ?? null,
    buscarEdificioPorNombre: async (n) => docs.find((d) => d.tipo === "edificio" && d.nombre.toLowerCase() === n.toLowerCase()) ?? null,
    insertarEdificio: async (d) => {
      const n = { _id: new ObjectId(), ...d };
      docs.push(n);
      return n;
    },
    actualizar: async (id, c) => {
      const d = docs.find((x) => String(x._id) === String(id));
      Object.assign(d, c.$set ?? {});
      if (c.$push) for (const [k, v] of Object.entries(c.$push)) d[k] = [...(d[k] ?? []), v];
      return true;
    },
    actualizarCategoria: async (clave, $set) => Object.assign(docs.find((d) => d.tipo === "categoria" && d.clave === clave), $set) && true,
  };
  const bitacoraRepo = { registrar: async (e) => void bitacora.push(e), listar: async () => ({ datos: [], total: 0 }) };
  const t = crearTokens({ secret: "s-" + Math.random(), expiresIn: "1h" });
  const auth = autenticar({ usuariosRepo, hasher, tokens: t });
  const auditor = crearAuditor({ bitacoraRepo });
  catalogos = gestionarCatalogos({ catalogosRepo, auditor });
  app = crearApp({
    auth,
    auditor,
    catalogos,
    admin: {
      usuarios: gestionarUsuarios({ usuariosRepo, hasher, auditor }),
      administrar: administrar({ bitacoraRepo, adminRepo: {}, almacen: {} }),
    },
  });
  tokens = {
    adm: t.firmar({ sub: String(ids.adm), rol: "superAdmin", nombre: "x" }),
    tec: t.firmar({ sub: String(ids.tec), rol: "tecnico", nombre: "x" }),
    rep: t.firmar({ sub: String(ids.rep), rol: "reportante", nombre: "x" }),
  };
});

const como = (q) => ({ Authorization: `Bearer ${tokens[q]}` });
const acciones = () => bitacora.map((e) => e.accion);

describe("catálogo público", () => {
  it("sin catálogo sembrado devuelve los valores iniciales", async () => {
    const r = await request(app).get("/api/catalogos").set(como("rep"));
    expect(r.status).toBe(200);
    expect(r.body.categorias.map((c) => c.clave)).toEqual(["computo_redes", "infraestructura_fisica", "servicios_academicos"]);
    expect(r.body.edificios.map((e) => e.nombre)).toContain("Biblioteca");
    expect(docs.length).toBe(0); // leer no escribe en la base
  });

  it("requiere sesión", async () => {
    expect((await request(app).get("/api/catalogos")).status).toBe(401);
  });
});

describe("administración de catálogos", () => {
  it("solo el superAdmin entra", async () => {
    expect((await request(app).get("/api/admin/catalogos").set(como("tec"))).status).toBe(403);
    expect((await request(app).post("/api/admin/catalogos/edificios").set(como("rep")).send({ nombre: "Nuevo" })).status).toBe(403);
    expect((await request(app).get("/api/admin/catalogos").set(como("adm"))).status).toBe(200);
  });

  it("crea un edificio con espacios y lo registra en la bitácora; el nombre repetido da 409", async () => {
    const r = await request(app).post("/api/admin/catalogos/edificios").set(como("adm")).send({ nombre: "Edificio C", espacios: ["Aula 1", "aula 1", "Aula 2"] });
    expect(r.status).toBe(201);
    expect(r.body.edificio.espacios.map((e) => e.nombre)).toEqual(["Aula 1", "Aula 2"]);
    expect(acciones()).toContain("catalogo.edificio_crear");
    expect((await request(app).post("/api/admin/catalogos/edificios").set(como("adm")).send({ nombre: "edificio c" })).status).toBe(409);
  });

  it("desactiva un edificio y deja de salir en el catálogo público", async () => {
    await request(app).get("/api/admin/catalogos").set(como("adm")); // siembra
    const a = docs.find((d) => d.nombre === "Biblioteca");
    const r = await request(app).patch(`/api/admin/catalogos/edificios/${a._id}`).set(como("adm")).send({ activo: false });
    expect(r.status).toBe(200);
    const publico = await request(app).get("/api/catalogos").set(como("rep"));
    expect(publico.body.edificios.map((e) => e.nombre)).not.toContain("Biblioteca");
  });

  it("no deja desactivar todos los edificios ni todas las categorías", async () => {
    await request(app).get("/api/admin/catalogos").set(como("adm"));
    const edificios = docs.filter((d) => d.tipo === "edificio");
    for (const e of edificios.slice(0, -1)) await request(app).patch(`/api/admin/catalogos/edificios/${e._id}`).set(como("adm")).send({ activo: false });
    const ultimo = edificios.at(-1);
    expect((await request(app).patch(`/api/admin/catalogos/edificios/${ultimo._id}`).set(como("adm")).send({ activo: false })).status).toBe(409);
    await request(app).patch("/api/admin/catalogos/categorias/computo_redes").set(como("adm")).send({ activo: false });
    await request(app).patch("/api/admin/catalogos/categorias/infraestructura_fisica").set(como("adm")).send({ activo: false });
    expect((await request(app).patch("/api/admin/catalogos/categorias/servicios_academicos").set(como("adm")).send({ activo: false })).status).toBe(409);
  });

  it("administra espacios: agrega, repite (409), desactiva y renombra", async () => {
    await request(app).get("/api/admin/catalogos").set(como("adm"));
    const id = String(docs.find((d) => d.nombre === "Edificio A")._id);
    expect((await request(app).post(`/api/admin/catalogos/edificios/${id}/espacios`).set(como("adm")).send({ nombre: "Aula 101" })).status).toBe(201);
    expect((await request(app).post(`/api/admin/catalogos/edificios/${id}/espacios`).set(como("adm")).send({ nombre: "aula 101" })).status).toBe(409);
    const off = await request(app).patch(`/api/admin/catalogos/edificios/${id}/espacios/${encodeURIComponent("Aula 101")}`).set(como("adm")).send({ activo: false });
    expect(off.body.edificio.espacios[0].activo).toBe(false);
    const ren = await request(app).patch(`/api/admin/catalogos/edificios/${id}/espacios/${encodeURIComponent("Aula 101")}`).set(como("adm")).send({ nombre: "Aula 102" });
    expect(ren.body.edificio.espacios[0].nombre).toBe("Aula 102");
    expect((await request(app).patch(`/api/admin/catalogos/edificios/${id}/espacios/Inexistente`).set(como("adm")).send({ activo: true })).status).toBe(404);
  });

  it("rechaza campos desconocidos y categorías inexistentes", async () => {
    expect((await request(app).post("/api/admin/catalogos/edificios").set(como("adm")).send({ nombre: "Edificio Z", rol: "x" })).status).toBe(400);
    expect((await request(app).patch("/api/admin/catalogos/categorias/inventada").set(como("adm")).send({ activo: false })).status).toBe(404);
  });

  it("no existe ruta para borrar catálogos", async () => {
    await request(app).get("/api/admin/catalogos").set(como("adm"));
    const id = String(docs.find((d) => d.tipo === "edificio")._id);
    expect((await request(app).delete(`/api/admin/catalogos/edificios/${id}`).set(como("adm"))).status).toBe(404);
  });
});

describe("validación de incidencias contra el catálogo", () => {
  const ubic = (edificio, espacio) => ({ categoria: "servicios_academicos", ubicacion: { edificio, espacio } });

  it("sin catálogo sembrado no restringe", async () => {
    await expect(catalogos.validarUbicacion(ubic("Cualquiera", "Lo que sea"))).resolves.toBeUndefined();
  });

  it("con catálogo exige edificio activo y, si hay espacios activos, uno de la lista", async () => {
    await request(app).get("/api/admin/catalogos").set(como("adm"));
    const id = String(docs.find((d) => d.nombre === "Edificio A")._id);
    await request(app).post(`/api/admin/catalogos/edificios/${id}/espacios`).set(como("adm")).send({ nombre: "Aula 101" });
    await expect(catalogos.validarUbicacion(ubic("Edificio A", "aula 101"))).resolves.toBeUndefined();
    await expect(catalogos.validarUbicacion(ubic("Edificio A", "Aula 999"))).rejects.toMatchObject({ codigo: "VALIDACION" });
    await expect(catalogos.validarUbicacion(ubic("Edificio B", "Cualquier cosa"))).resolves.toBeUndefined(); // sin espacios definidos
    await expect(catalogos.validarUbicacion(ubic("Edificio Fantasma", "x"))).rejects.toMatchObject({ codigo: "VALIDACION" });
    await request(app).patch("/api/admin/catalogos/categorias/servicios_academicos").set(como("adm")).send({ activo: false });
    await expect(catalogos.validarUbicacion(ubic("Edificio A", "Aula 101"))).rejects.toMatchObject({ codigo: "VALIDACION" });
  });
});

describe("técnicos", () => {
  it("actualiza disponibilidad y categorías y lo deja en la bitácora", async () => {
    const r = await request(app).patch(`/api/admin/tecnicos/${ids.tec}`).set(como("adm")).send({ disponible: false, categorias: ["computo_redes", "computo_redes"] });
    expect(r.status).toBe(200);
    expect(r.body.usuario).toMatchObject({ disponible: false, categorias: ["computo_redes"] });
    expect(acciones()).toContain("tecnico.actualizar");
    const lista = await request(app).get("/api/admin/tecnicos").set(como("adm"));
    expect(lista.body.datos.every((u) => u.rol === "tecnico")).toBe(true);
  });

  it("rechaza a quien no es técnico, categorías inválidas y a roles sin permiso", async () => {
    expect((await request(app).patch(`/api/admin/tecnicos/${ids.rep}`).set(como("adm")).send({ disponible: true })).status).toBe(400);
    expect((await request(app).patch(`/api/admin/tecnicos/${ids.tec}`).set(como("adm")).send({ categorias: ["otra"] })).status).toBe(400);
    expect((await request(app).patch(`/api/admin/tecnicos/${ids.tec}`).set(como("tec")).send({ disponible: false })).status).toBe(403);
  });

  it("al cambiar el rol de un técnico se limpian sus datos de técnico", async () => {
    await request(app).patch(`/api/admin/tecnicos/${ids.tec}`).set(como("adm")).send({ disponible: false, categorias: ["servicios_academicos"] });
    await request(app).patch(`/api/admin/usuarios/${ids.tec}/rol`).set(como("adm")).send({ rol: "coordinador" });
    const u = usuarios.find((x) => x._id === ids.tec);
    expect(u.rol).toBe("coordinador");
    expect(u.disponible).toBeUndefined();
    expect(u.categorias_atiende).toBeUndefined();
  });
});
