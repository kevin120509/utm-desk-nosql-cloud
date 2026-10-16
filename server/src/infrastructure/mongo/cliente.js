// Cliente único de MongoDB. Se cachea en globalThis para reutilizarlo entre
// invocaciones en entornos serverless (Vercel) y entre recargas en desarrollo.
import { MongoClient } from "mongodb";

const CLAVE = "__utmdesk_mongo_cliente__";

export async function obtenerBaseDeDatos() {
  const uri = process.env.MONGODB_URI;
  const nombre = process.env.MONGODB_DB;
  if (!uri) throw new Error("Falta la variable de entorno MONGODB_URI");
  if (!nombre) throw new Error("Falta la variable de entorno MONGODB_DB");

  if (!globalThis[CLAVE]) {
    // Se guarda la promesa para que llamadas concurrentes compartan una sola conexión.
    const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 10 });
    globalThis[CLAVE] = cliente.connect().catch((e) => {
      globalThis[CLAVE] = undefined;
      throw e;
    });
  }
  const cliente = await globalThis[CLAVE];
  return cliente.db(nombre);
}

export async function cerrarCliente() {
  const promesa = globalThis[CLAVE];
  globalThis[CLAVE] = undefined;
  if (promesa) {
    const cliente = await promesa.catch(() => null);
    if (cliente) await cliente.close();
  }
}
