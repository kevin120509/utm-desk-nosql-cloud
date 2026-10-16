// Arranque local del servidor: `npm run dev` (puerto 4000).
// Aquí se construyen las dependencias reales y se inyectan en la app.
import "dotenv/config";
import { MongoClient } from "mongodb";
import { crearApp } from "./interface/http/app.js";
import { autenticar } from "./application/autenticar.js";
import { UsuariosRepoMongo } from "./infrastructure/mongo/usuariosRepo.js";
import { registrarIncidencia } from "./application/registrarIncidencia.js";
import { actualizarEstado } from "./application/actualizarEstado.js";
import { listarIncidencias, obtenerIncidencia } from "./application/consultarIncidencias.js";
import { buscarIncidencias } from "./application/buscarIncidencias.js";
import { editarIncidencia } from "./application/editarIncidencia.js";
import { eliminarIncidencia } from "./application/eliminarIncidencia.js";
import { AlmacenNulo } from "./infrastructure/almacen/almacenNulo.js";
import { IncidenciasRepoMongo } from "./infrastructure/mongo/incidenciasRepo.js";
import { EtiquetasRepoMongo } from "./infrastructure/mongo/etiquetasRepo.js";
import { gestionarEtiquetas } from "./application/gestionarEtiquetas.js";
import { AnaliticaRepoMongo } from "./infrastructure/mongo/analiticaRepo.js";
import { consultarAnalitica } from "./application/consultarAnalitica.js";
import { ContadorMongo } from "./infrastructure/mongo/contadorMongo.js";
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

const usuariosRepo = new UsuariosRepoMongo(db.collection("usuarios"));
const incidenciasRepo = new IncidenciasRepoMongo(db.collection("incidencias_campus"));
const incidencias = {
  registrar: registrarIncidencia({
    incidenciasRepo,
    contador: new ContadorMongo(db.collection("contadores")),
    usuariosRepo,
  }),
  listar: listarIncidencias({ incidenciasRepo }),
  obtener: obtenerIncidencia({ incidenciasRepo }),
  buscar: buscarIncidencias({ incidenciasRepo }),
  actualizarEstado: actualizarEstado({ incidenciasRepo, usuariosRepo }),
  editar: editarIncidencia({ incidenciasRepo }),
  // AlmacenNulo hasta que B09 aporte el adaptador real de Supabase.
  eliminar: eliminarIncidencia({ incidenciasRepo, almacen: new AlmacenNulo() }),
};

const etiquetas = gestionarEtiquetas({
  etiquetasRepo: new EtiquetasRepoMongo(db.collection("incidencias_campus")),
});

const analitica = consultarAnalitica({
  analiticaRepo: new AnaliticaRepoMongo(db.collection("incidencias_campus")),
});

crearApp({ auth, incidencias, etiquetas, analitica }).listen(puerto, () => {
  console.log(`UTM Desk API escuchando en http://localhost:${puerto}/api`);
});
