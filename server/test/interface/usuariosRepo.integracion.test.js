// Integración opcional con Atlas: colección temporal que se elimina al final.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import { UsuariosRepoMongo } from "../../src/infrastructure/mongo/usuariosRepo.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

describe.skipIf(!hayEntorno)("UsuariosRepoMongo (Atlas)", () => {
  let client, col, repo, id;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const nombre = "usuarios_test_" + Math.random().toString(36).slice(2, 10);
    col = client.db(process.env.MONGODB_DB).collection(nombre);
    const r = await col.insertOne({ nombre: "T", correo: "t@utm.mx", rol: "tecnico", password_hash: "x", activo: true });
    id = r.insertedId;
    repo = new UsuariosRepoMongo(col);
  });

  afterAll(async () => {
    await col?.drop().catch(() => {});
    await client?.close();
  });

  it("busca por correo", async () => {
    expect((await repo.buscarPorCorreo("t@utm.mx")).nombre).toBe("T");
    expect(await repo.buscarPorCorreo("no@utm.mx")).toBeNull();
  });

  it("busca por id (string) y tolera ids inválidos", async () => {
    expect((await repo.buscarPorId(String(id))).correo).toBe("t@utm.mx");
    expect(await repo.buscarPorId("no-es-oid")).toBeNull();
  });
});
