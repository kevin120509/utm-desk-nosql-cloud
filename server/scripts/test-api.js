// Corre la colección de Postman con Newman (R03).
//
//   npm run test:api                        Arranca la API local en un puerto libre y la prueba.
//   API_URL=https://mi-api.vercel.app/api npm run test:api
//                                           Prueba una API ya desplegada (no arranca nada).
//
// Usa SEED_DEFAULT_PASSWORD de server/.env como contraseña de las cuentas de demostración
// y escribe el reporte en `postman/resultados/` (ignorado por git).
import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import newman from "newman";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const carpetaPostman = resolve(raiz, "postman");
const serverDir = resolve(raiz, "server");

if (!process.env.SEED_DEFAULT_PASSWORD) {
  console.error("Falta SEED_DEFAULT_PASSWORD en server/.env (la contraseña de las cuentas del seed).");
  process.exit(1);
}

let servidor;
let baseUrl = process.env.API_URL?.replace(/\/$/, "");

async function arrancarServidorLocal() {
  const puerto = 4012;
  servidor = spawn(process.execPath, ["src/index.js"], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(puerto) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let salida = "";
  servidor.stdout.on("data", (d) => (salida += d));
  servidor.stderr.on("data", (d) => (salida += d));
  for (let i = 0; i < 80; i++) {
    if (salida.includes("escuchando")) return `http://localhost:${puerto}/api`;
    if (servidor.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`El servidor local no arrancó: ${salida.slice(0, 300)}`);
}

let codigoSalida = 1;
try {
  if (!baseUrl) baseUrl = await arrancarServidorLocal();
  console.log(`API bajo prueba: ${baseUrl}\n`);
  await mkdir(resolve(carpetaPostman, "resultados"), { recursive: true });

  const resumen = await new Promise((resolver, rechazar) => {
    newman.run(
      {
        collection: resolve(carpetaPostman, "UTM-Desk.postman_collection.json"),
        environment: resolve(carpetaPostman, "UTM-Desk.local.postman_environment.json"),
        envVar: [
          { key: "base_url", value: baseUrl },
          { key: "password", value: process.env.SEED_DEFAULT_PASSWORD },
        ],
        workingDir: carpetaPostman, // para los archivos de `fixtures/`
        insecureFileRead: false,
        timeoutRequest: 30000,
        reporters: ["cli", "json"],
        reporter: { json: { export: resolve(carpetaPostman, "resultados", "newman.json") } },
      },
      (err, run) => (err ? rechazar(err) : resolver(run.run)),
    );
  });

  const { assertions, requests } = resumen.stats;
  const fallos = resumen.failures.length;
  console.log(
    `\nPeticiones: ${requests.total} | Pruebas: ${assertions.total - assertions.failed}/${assertions.total} correctas | Fallos: ${fallos}`,
  );
  codigoSalida = fallos === 0 && assertions.failed === 0 ? 0 : 1;
} catch (e) {
  console.error(`test:api falló: ${e.message}`);
} finally {
  servidor?.kill();
}
process.exit(codigoSalida);
