// Raíz de composición: construye las dependencias reales (Mongo, Supabase, JWT) y las inyecta
// en la app de Express. La usan el arranque local (`src/index.js`) y la función serverless de
// Vercel (`api/index.js`). No lee `.env`: las variables ya vienen en `process.env`.
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
import { AlmacenSupabase } from "./infrastructure/almacen/almacenSupabase.js";
import { detectarTipo } from "./infrastructure/archivos/detectarTipo.js";
import { cargarEvidencia } from "./application/cargarEvidencia.js";
import { obtenerBaseDeDatos } from "./infrastructure/mongo/cliente.js";
import { IncidenciasRepoMongo } from "./infrastructure/mongo/incidenciasRepo.js";
import { EtiquetasRepoMongo } from "./infrastructure/mongo/etiquetasRepo.js";
import { gestionarEtiquetas } from "./application/gestionarEtiquetas.js";
import { AnaliticaRepoMongo } from "./infrastructure/mongo/analiticaRepo.js";
import { consultarAnalitica } from "./application/consultarAnalitica.js";
import { BitacoraRepoMongo } from "./infrastructure/mongo/bitacoraRepo.js";
import { AdminRepoMongo } from "./infrastructure/mongo/adminRepo.js";
import { crearAuditor } from "./application/auditoria.js";
import { CatalogosRepoMongo } from "./infrastructure/mongo/catalogosRepo.js";
import { gestionarCatalogos } from "./application/gestionarCatalogos.js";
import { gestionarUsuarios } from "./application/gestionarUsuarios.js";
import { registrarUsuario } from "./application/registrarUsuario.js";
import { administrar } from "./application/administrar.js";
import { ContadorMongo } from "./infrastructure/mongo/contadorMongo.js";
import { hasherBcrypt } from "./infrastructure/seguridad/bcrypt.js";
import { crearTokens } from "./infrastructure/seguridad/jwt.js";

/**
 * @returns {Promise<import("express").Express>} la aplicación lista para atender peticiones.
 */
export async function construirApp() {
  // El cliente de Mongo vive en globalThis (cliente.js): se reutiliza entre invocaciones.
  const db = await obtenerBaseDeDatos();

  const usuariosRepo = new UsuariosRepoMongo(db.collection("usuarios"));
  const auth = autenticar({
    usuariosRepo,
    hasher: hasherBcrypt,
    tokens: crearTokens(), // falla aquí si falta JWT_SECRET
  });

  // Almacén de archivos: Supabase si hay credenciales; si no, uno nulo que avisa en consola.
  const ttlSegundos = Number(process.env.SIGNED_URL_TTL_SECONDS) || 3600;
  const almacen =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? new AlmacenSupabase({
          url: process.env.SUPABASE_URL,
          claveSecreta: process.env.SUPABASE_SERVICE_ROLE_KEY,
          bucket: process.env.SUPABASE_BUCKET || "evidencias",
        })
      : new AlmacenNulo();

  // Bitácora y auditoría: cada acción administrativa y evento de seguridad deja rastro.
  const bitacoraRepo = new BitacoraRepoMongo(db.collection("bitacora"));
  const auditor = crearAuditor({ bitacoraRepo });

  // Catálogos administrables (categorías, edificios, espacios). Con la colección vacía no restringen nada.
  const catalogos = gestionarCatalogos({ catalogosRepo: new CatalogosRepoMongo(db.collection("catalogos")), auditor });

  const incidenciasRepo = new IncidenciasRepoMongo(db.collection("incidencias_campus"));
  const incidencias = {
    registrar: registrarIncidencia({
      incidenciasRepo,
      contador: new ContadorMongo(db.collection("contadores")),
      usuariosRepo,
      catalogos,
    }),
    listar: listarIncidencias({ incidenciasRepo }),
    obtener: obtenerIncidencia({ incidenciasRepo, almacen, ttlSegundos }),
    buscar: buscarIncidencias({ incidenciasRepo }),
    actualizarEstado: actualizarEstado({ incidenciasRepo, usuariosRepo }),
    editar: editarIncidencia({ incidenciasRepo }),
    eliminar: eliminarIncidencia({ incidenciasRepo, almacen }),
  };

  const evidencias = {
    cargar: cargarEvidencia({ incidenciasRepo, almacen, detectarTipo, ttlSegundos }),
  };

  const etiquetas = gestionarEtiquetas({
    etiquetasRepo: new EtiquetasRepoMongo(db.collection("incidencias_campus")),
  });

  const analitica = consultarAnalitica({
    analiticaRepo: new AnaliticaRepoMongo(db.collection("incidencias_campus")),
  });

  // Administración (superAdmin) y registro público.
  const admin = {
    usuarios: gestionarUsuarios({ usuariosRepo, hasher: hasherBcrypt, auditor }),
    administrar: administrar({ bitacoraRepo, adminRepo: new AdminRepoMongo(db), almacen }),
  };
  const registro = registrarUsuario({
    usuariosRepo,
    hasher: hasherBcrypt,
    auditor,
    abierto: process.env.REGISTRO_ABIERTO !== "false",
  });

  return crearApp({ auth, incidencias, etiquetas, evidencias, analitica, admin, catalogos, registro, auditor });
}
