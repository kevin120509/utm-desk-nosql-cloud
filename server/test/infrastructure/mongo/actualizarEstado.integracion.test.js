// Integración con Atlas: cambio de estado atómico (RF-07). Colecciones temporales que se eliminan al final.
import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { configurarBaseDeDatos } from "../../../src/infrastructure/mongo/configurarBaseDeDatos.js";
import { IncidenciasRepoMongo } from "../../../src/infrastructure/mongo/incidenciasRepo.js";
import { ContadorMongo } from "../../../src/infrastructure/mongo/contadorMongo.js";
import { UsuariosRepoMongo } from "../../../src/infrastructure/mongo/usuariosRepo.js";
import { registrarIncidencia } from "../../../src/application/registrarIncidencia.js";
import { actualizarEstado } from "../../../src/application/actualizarEstado.js";

const hayEntorno = Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);

const entrada = {
  titulo: "Switch del laboratorio sin respuesta",
  descripcion: "Desde las 8:00 los equipos no obtienen red.",
  prioridad: "alta",
  ubicacion: { edificio: "Laboratorios de Cómputo", piso: 1, espacio: "LC-2" },
  categoria: "computo_redes",
  detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 28 },
};
const cuerpo = (estado_nuevo, horas, comentario = "Avance registrado") => ({ estado_nuevo, horas, comentario });

describe.skipIf(!hayEntorno)("actualizarEstado (Atlas real)", () => {
  const sufijo = Math.random().toString(36).slice(2, 10);
  const nombres = { inc: `incidencias_campus_test_${sufijo}`, usr: `usuarios_test_${sufijo}`, cont: `contadores_test_${sufijo}` };
  let client, db, colInc, registrar, actualizar, rep, tec, coord;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    await configurarBaseDeDatos(db, { coleccionIncidencias: nombres.inc, coleccionUsuarios: nombres.usr });
    const hash = await bcrypt.hash("t" + Math.random(), 4);
    const crearUsuario = async (nombre, rol, extra = {}) => {
      const r = await db.collection(nombres.usr).insertOne({
        nombre, correo: `${rol}_${sufijo}@utm.mx`, rol, password_hash: hash, activo: true, ...extra,
      });
      return { id: String(r.insertedId), rol, nombre };
    };
    rep = await crearUsuario("Ana Prueba", "reportante", { tipo: "docente" });
    tec = await crearUsuario("Tec Prueba", "tecnico");
    coord = await crearUsuario("Coord Prueba", "coordinador");
    colInc = db.collection(nombres.inc);
    const incidenciasRepo = new IncidenciasRepoMongo(colInc);
    const usuariosRepo = new UsuariosRepoMongo(db.collection(nombres.usr));
    registrar = registrarIncidencia({ incidenciasRepo, contador: new ContadorMongo(db.collection(nombres.cont)), usuariosRepo });
    actualizar = actualizarEstado({ incidenciasRepo, usuariosRepo });
  }, 60000);

  afterAll(async () => {
    for (const n of Object.values(nombres)) await db?.collection(n).drop().catch(() => {});
    await client?.close();
  });

  it("abierta -> en proceso -> resuelta acumula horas, bitácora y fecha_resolucion", async () => {
    const { codigo } = await registrar(rep, entrada);
    const enProceso = await actualizar(tec, codigo, cuerpo("en proceso", 1.5));
    expect(enProceso).not.toHaveProperty("fecha_resolucion");
    expect(enProceso).not.toHaveProperty("asignado_a");

    const resuelta = await actualizar(tec, codigo, cuerpo("resuelta", 2));
    expect(resuelta.estado).toBe("resuelta");
    expect(resuelta.horas_invertidas).toBe(3.5);
    expect(resuelta.historial_seguimiento).toHaveLength(3);
    expect(resuelta.fecha_resolucion).toBeInstanceOf(Date);
    // El $jsonSchema valida en cada escritura: si el documento no cumpliera, el updateOne anterior habría fallado.
  }, 60000);

  it("concurrencia: de dos cambios simultáneos solo uno gana", async () => {
    const { codigo } = await registrar(rep, entrada);
    // Barrera: las dos peticiones LEEN el estado "abierta" antes de que cualquiera escriba
    // (así se reproduce la carrera real entre dos personas con la pantalla vieja).
    let lecturas = 0;
    let liberar;
    const ambasLeyeron = new Promise((r) => (liberar = r));
    const repoReal = new IncidenciasRepoMongo(colInc);
    const repoConBarrera = {
      buscarPorCodigo: async (c) => {
        const doc = await repoReal.buscarPorCodigo(c);
        if (lecturas++ < 2) {
          if (lecturas === 2) liberar();
          await ambasLeyeron;
        }
        return doc;
      },
      actualizarEstado: (datos) => repoReal.actualizarEstado(datos),
    };
    const usuariosRepo = new UsuariosRepoMongo(db.collection(nombres.usr));
    const actualizarConcurrente = actualizarEstado({ incidenciasRepo: repoConBarrera, usuariosRepo });
    const resultados = await Promise.allSettled([
      actualizarConcurrente(tec, codigo, cuerpo("en proceso", 1)),
      actualizarConcurrente(tec, codigo, cuerpo("en espera", 2)),
    ]);
    const ok = resultados.filter((r) => r.status === "fulfilled");
    const fallos = resultados.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(fallos).toHaveLength(1);
    expect(fallos[0].reason.codigo).toBe("CONFLICTO");

    const doc = await colInc.findOne({ codigo });
    const horasGanadora = doc.historial_seguimiento.at(-1).horas;
    expect(doc.horas_invertidas).toBe(horasGanadora);
    expect(doc.historial_seguimiento).toHaveLength(2);
  }, 60000);

  it("coordinador cierra y conserva fecha_resolucion", async () => {
    const { codigo } = await registrar(rep, entrada);
    const resuelta = await actualizar(coord, codigo, cuerpo("resuelta", 1));
    const cerrada = await actualizar(coord, codigo, cuerpo("cerrada", 0, "Cierre administrativo"));
    expect(cerrada.estado).toBe("cerrada");
    expect(cerrada.fecha_resolucion).toEqual(resuelta.fecha_resolucion);
    expect(cerrada).not.toHaveProperty("asignado_a"); // el coordinador no se asigna
  }, 60000);

  it("un técnico no puede cerrar", async () => {
    const { codigo } = await registrar(rep, entrada);
    await actualizar(tec, codigo, cuerpo("resuelta", 1));
    await expect(actualizar(tec, codigo, cuerpo("cerrada", 0))).rejects.toMatchObject({ codigo: "TRANSICION_INVALIDA" });
    expect((await colInc.findOne({ codigo })).estado).toBe("resuelta");
  }, 60000);
});
