// Asigna el rol superAdmin a un usuario que YA EXISTE. Nunca crea usuarios.
// Uso (simulación por defecto):  npm run admin:promover -- --correo ana@utm.edu.mx
// Aplicar de verdad:             npm run admin:promover -- --correo ana@utm.edu.mx --yes
import "dotenv/config";
import { obtenerBaseDeDatos, cerrarCliente } from "../src/infrastructure/mongo/cliente.js";

const args = process.argv.slice(2);
const correo = args[args.indexOf("--correo") + 1]?.trim().toLowerCase();
const aplicar = args.includes("--yes");

try {
  if (!correo || args.indexOf("--correo") === -1) {
    throw new Error("Falta --correo <correo del usuario existente>");
  }
  const db = await obtenerBaseDeDatos();
  const coleccion = db.collection("usuarios");
  const usuario = await coleccion.findOne({ correo }, { projection: { password_hash: 0 } });
  if (!usuario) throw new Error(`No existe ningún usuario con el correo ${correo}. Este script no crea usuarios.`);

  console.log(`Usuario: ${usuario.nombre} (${correo}), rol actual: ${usuario.rol}`);
  if (usuario.rol === "superAdmin") {
    console.log("Ya es superAdmin. No hay nada que hacer.");
  } else if (!aplicar) {
    console.log("SIMULACIÓN: se asignaría el rol superAdmin (y se quitaría tipo si era reportante). Agrega --yes para aplicar.");
  } else {
    // superAdmin no lleva `tipo`: se quita si existía.
    await coleccion.updateOne({ _id: usuario._id }, { $set: { rol: "superAdmin" }, $unset: { tipo: "" } });
    console.log("Listo: el usuario ahora es superAdmin.");
  }
} catch (e) {
  console.error(`admin:promover falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await cerrarCliente();
}
