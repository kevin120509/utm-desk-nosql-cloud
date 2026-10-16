// Genera el SCRIPT MAESTRO de mongosh (entregable del enunciado): crea la colección con su
// validador $jsonSchema, los índices obligatorios, carga los documentos y deja listas las
// consultas de demostración (operadores atómicos, búsqueda de texto y los dos pipelines).
// Función PURA: recibe todo por parámetro y devuelve el texto del script.
import { aLiteralMongosh } from "./serializar.js";

/**
 * @param {{incidencias: object[], validador: object, indicesIncidencias: object[],
 *          indicesUsuarios: object[], nombreBd?: string, generadoEn?: Date}} datos
 * @returns {string}
 */
export function generarScriptMaestro({
  incidencias,
  validador,
  indicesIncidencias,
  indicesUsuarios,
  nombreBd = "utmdesk",
  generadoEn = new Date(),
}) {
  const crearIndice = (coleccion, { key, ...opciones }) =>
    `bd.${coleccion}.createIndex(${aLiteralMongosh(key)}, ${aLiteralMongosh(opciones)});`;

  const ejemplo = incidencias.find((d) => d.estado === "en proceso") ?? incidencias[0];

  return `// =============================================================================
// UTM Desk NoSQL Cloud — Script maestro de MongoDB (mongosh)
// Generado: ${generadoEn.toISOString()}
//
// Uso (en una base VACÍA):
//   mongosh "<cadena de conexión de Atlas>" --file script-maestro.js
//
// Crea la colección incidencias_campus con su validador $jsonSchema, los 3 índices
// obligatorios del enunciado (compuesto, TTL de 60 días y texto en español) más 2 de apoyo,
// carga ${incidencias.length} incidencias de demostración y deja listas las consultas finales.
// La colección usuarios se crea vacía (sus documentos llevan hashes de contraseña y no se exportan).
// =============================================================================

const NOMBRE_BD = ${JSON.stringify(nombreBd)};
const bd = db.getSiblingDB(NOMBRE_BD);

// --- 1. Colección con validador (segunda línea de defensa; la primera es Zod en la API) ---
bd.createCollection("incidencias_campus", {
  validator: ${aLiteralMongosh(validador, 1)},
  validationLevel: "strict",
  validationAction: "error"
});

// --- 2. Índices de incidencias_campus ---
// 2.1 Compuesto { categoria, estado, ubicacion.edificio }   2.2 TTL de 60 días sobre fecha_resolucion
// 2.3 Texto ponderado en español (título pesa 10, descripción 5)
// 2.4 y 2.5: acceso por código y "mis incidencias" (apoyo)
${indicesIncidencias.map((i) => crearIndice("incidencias_campus", i)).join("\n")}

// --- 3. Colección usuarios (vacía) ---
bd.createCollection("usuarios");
${indicesUsuarios.map((i) => crearIndice("usuarios", i)).join("\n")}

// --- 4. Datos de demostración: ${incidencias.length} incidencias de 3 categorías ---
bd.incidencias_campus.insertMany(${aLiteralMongosh(incidencias)});

print("Incidencias cargadas: " + bd.incidencias_campus.countDocuments({}));

// =============================================================================
// 5. Consultas y operaciones del enunciado
// =============================================================================

// 5.1 Búsqueda textual con relevancia (CU-05): $text + textScore, orden descendente
printjson(
  bd.incidencias_campus
    .find({ $text: { $search: "filtración" } }, { titulo: 1, codigo: 1, score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } })
    .limit(5)
    .toArray()
);

// 5.2 Pipeline 1 — eficiencia por edificio (CU-06): promedio y total de horas
printjson(
  bd.incidencias_campus
    .aggregate([
      { $match: { estado: { $in: ["resuelta", "cerrada"] }, fecha_resolucion: { $exists: true } } },
      {
        $addFields: {
          horas_transcurridas: {
            $dateDiff: { startDate: "$fecha_creacion", endDate: "$fecha_resolucion", unit: "hour" }
          }
        }
      },
      {
        $group: {
          _id: "$ubicacion.edificio",
          promedio_horas_resolucion: { $avg: "$horas_transcurridas" },
          total_horas_trabajo: { $sum: "$horas_invertidas" },
          total_incidencias: { $sum: 1 }
        }
      },
      { $sort: { promedio_horas_resolucion: -1 } }
    ])
    .toArray()
);

// 5.3 Pipeline 2 — ranking de los 10 tags más frecuentes (fallas crónicas)
printjson(
  bd.incidencias_campus
    .aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", total: { $sum: 1 }, edificios: { $addToSet: "$ubicacion.edificio" } } },
      { $sort: { total: -1, _id: 1 } },
      { $limit: 10 }
    ])
    .toArray()
);

// =============================================================================
// 6. Operadores atómicos (CU-02, CU-03, CU-04). Se dejan COMENTADOS para no alterar los datos;
//    descomenta el bloque para probarlos sobre ${ejemplo.codigo}.
// =============================================================================
/*
// CU-03 — un solo updateOne atómico: $set (estado) + $push (bitácora) + $inc (horas)
bd.incidencias_campus.updateOne(
  { codigo: ${JSON.stringify(ejemplo.codigo)}, estado: ${JSON.stringify(ejemplo.estado)} },
  {
    $set: { estado: "en espera", fecha_actualizacion: new Date() },
    $push: {
      historial_seguimiento: {
        fecha: new Date(),
        autor: { usuario_id: ObjectId(), nombre: "Técnico de demostración" },
        estado_anterior: ${JSON.stringify(ejemplo.estado)},
        estado_nuevo: "en espera",
        comentario: "Esperando refacción",
        horas: 1.5
      }
    },
    $inc: { horas_invertidas: 1.5 }
  }
);

// CU-04 — etiquetas sin duplicados: $addToSet y $pull
bd.incidencias_campus.updateOne({ codigo: ${JSON.stringify(ejemplo.codigo)} }, { $addToSet: { tags: "revisar" } });
bd.incidencias_campus.updateOne({ codigo: ${JSON.stringify(ejemplo.codigo)} }, { $pull: { tags: "revisar" } });

// CU-02 — evidencia: $push al arreglo evidencias_adjuntas (solo metadatos; el archivo vive en el bucket)
bd.incidencias_campus.updateOne(
  { codigo: ${JSON.stringify(ejemplo.codigo)} },
  {
    $push: {
      evidencias_adjuntas: {
        nombre_archivo: "captura.png",
        tipo_mime: "image/png",
        peso_kb: 120.5,
        storage_path: ${JSON.stringify(ejemplo.codigo + "/captura.png")},
        url_storage: "https://ejemplo.invalid/firmada",
        url_expira: new Date(Date.now() + 3600 * 1000),
        fecha_carga: new Date()
      }
    }
  }
);
*/

print("Script maestro completo en la base " + NOMBRE_BD);
`;
}
