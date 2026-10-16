// Arranque local del servidor: `npm run dev` (puerto 4000).
// Aquí se construyen las dependencias reales y se inyectan en la app.
import "dotenv/config";
import { MongoClient } from "mongodb";
import { crearApp } from "./interface/http/app.js";
import { autenticar } from "./application/autenticar.js";
import { UsuariosRepoMongo } from "./infrastructure/mongo/usuariosRepo.js";
import { hasherBcrypt } from "./infrastructure/seguridad/bcrypt.js";
import { crearTokens } from "./infrastructure/seguridad/jwt.js";

const puerto = Number(process.env.PORT) || 4000;

const cliente = new MongoClient(process.env.MONGODB_URI);
await cliente.connect();
const db = cliente.db(process.env.MONGODB_DB);

const auth = autenticar({
  usuariosRepo: new UsuariosRepoMongo(db.collection("usuarios")),
  hasher: hasherBcrypt,
  tokens: crearTokens(), // falla aquí si falta JWT_SECRET
});

crearApp({ auth }).listen(puerto, () => {
  console.log(`UTM Desk API escuchando en http://localhost:${puerto}/api`);
});
