// =============================================================================
// UTM Desk NoSQL Cloud — Script maestro de MongoDB (mongosh)
// Generado: 2026-10-16T01:25:52.418Z
//
// Uso (en una base VACÍA):
//   mongosh "<cadena de conexión de Atlas>" --file script-maestro.js
//
// Crea la colección incidencias_campus con su validador $jsonSchema, los 3 índices
// obligatorios del enunciado (compuesto, TTL de 60 días y texto en español) más 2 de apoyo,
// carga 24 incidencias de demostración y deja listas las consultas finales.
// La colección usuarios se crea vacía (sus documentos llevan hashes de contraseña y no se exportan).
// =============================================================================

const NOMBRE_BD = "utmdesk";
const bd = db.getSiblingDB(NOMBRE_BD);

// --- 1. Colección con validador (segunda línea de defensa; la primera es Zod en la API) ---
bd.createCollection("incidencias_campus", {
  validator: {
    "$jsonSchema": {
      bsonType: "object",
      required: ["codigo", "consecutivo_diario", "titulo", "descripcion", "categoria", "prioridad", "estado", "reportante", "ubicacion", "detalle_especifico", "tags", "historial_seguimiento", "evidencias_adjuntas", "horas_invertidas", "fecha_creacion", "fecha_actualizacion"],
      additionalProperties: false,
      properties: {
        _id: {
          bsonType: "objectId"
        },
        codigo: {
          bsonType: "string",
          pattern: "^INC-\\d{4}-\\d{4,}$"
        },
        consecutivo_diario: {
          bsonType: ["int", "long", "double"],
          minimum: 1
        },
        titulo: {
          bsonType: "string",
          minLength: 5,
          maxLength: 120
        },
        descripcion: {
          bsonType: "string",
          minLength: 10,
          maxLength: 2000
        },
        categoria: {
          enum: ["computo_redes", "infraestructura", "academico"]
        },
        prioridad: {
          enum: ["baja", "media", "alta", "critica"]
        },
        estado: {
          enum: ["abierta", "en proceso", "en espera", "resuelta", "cerrada"]
        },
        reportante: {
          bsonType: "object",
          required: ["usuario_id", "nombre", "tipo", "correo"],
          additionalProperties: false,
          properties: {
            usuario_id: {
              bsonType: "objectId"
            },
            nombre: {
              bsonType: "string",
              minLength: 1,
              maxLength: 120
            },
            tipo: {
              enum: ["docente", "estudiante", "administrativo"]
            },
            correo: {
              bsonType: "string",
              minLength: 1,
              maxLength: 200
            }
          }
        },
        asignado_a: {
          bsonType: "object",
          required: ["usuario_id", "nombre"],
          additionalProperties: false,
          properties: {
            usuario_id: {
              bsonType: "objectId"
            },
            nombre: {
              bsonType: "string",
              minLength: 1,
              maxLength: 120
            }
          }
        },
        ubicacion: {
          bsonType: "object",
          required: ["edificio", "espacio"],
          additionalProperties: false,
          properties: {
            edificio: {
              bsonType: "string",
              minLength: 1,
              maxLength: 120
            },
            piso: {
              bsonType: ["int", "double"]
            },
            espacio: {
              bsonType: "string",
              minLength: 1,
              maxLength: 120
            }
          }
        },
        detalle_especifico: {
          bsonType: "object"
        },
        tags: {
          bsonType: "array",
          uniqueItems: true,
          items: {
            bsonType: "string",
            minLength: 2,
            maxLength: 40
          }
        },
        historial_seguimiento: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["fecha", "autor", "estado_nuevo", "comentario", "horas"],
            additionalProperties: false,
            properties: {
              fecha: {
                bsonType: "date"
              },
              autor: {
                bsonType: "object",
                required: ["usuario_id", "nombre"],
                additionalProperties: false,
                properties: {
                  usuario_id: {
                    bsonType: "objectId"
                  },
                  nombre: {
                    bsonType: "string",
                    minLength: 1,
                    maxLength: 120
                  }
                }
              },
              estado_anterior: {
                enum: ["abierta", "en proceso", "en espera", "resuelta", "cerrada"]
              },
              estado_nuevo: {
                enum: ["abierta", "en proceso", "en espera", "resuelta", "cerrada"]
              },
              comentario: {
                bsonType: "string",
                maxLength: 1000
              },
              horas: {
                bsonType: ["int", "double"],
                minimum: 0
              }
            }
          }
        },
        evidencias_adjuntas: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["nombre_archivo", "tipo_mime", "peso_kb", "storage_path", "url_storage", "url_expira", "fecha_carga"],
            additionalProperties: false,
            properties: {
              nombre_archivo: {
                bsonType: "string",
                minLength: 1,
                maxLength: 255
              },
              tipo_mime: {
                bsonType: "string",
                minLength: 1,
                maxLength: 100
              },
              peso_kb: {
                bsonType: ["int", "double"],
                minimum: 0
              },
              storage_path: {
                bsonType: "string",
                minLength: 1
              },
              url_storage: {
                bsonType: "string",
                minLength: 1
              },
              url_expira: {
                bsonType: "date"
              },
              fecha_carga: {
                bsonType: "date"
              }
            }
          }
        },
        horas_invertidas: {
          bsonType: ["int", "double"],
          minimum: 0
        },
        fecha_creacion: {
          bsonType: "date"
        },
        fecha_actualizacion: {
          bsonType: "date"
        },
        fecha_resolucion: {
          bsonType: "date"
        }
      },
      allOf: [
        {
          oneOf: [
            {
              properties: {
                categoria: {
                  enum: ["computo_redes"]
                },
                detalle_especifico: {
                  bsonType: "object",
                  required: ["tipo_falla", "direccion_ip", "vlan", "puerto_uplink", "equipos_afectados"],
                  additionalProperties: false,
                  properties: {
                    tipo_falla: {
                      enum: ["switch", "access_point", "servidor", "equipo_laboratorio"]
                    },
                    direccion_ip: {
                      bsonType: "string",
                      pattern: "^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$"
                    },
                    vlan: {
                      bsonType: ["int", "long", "double"],
                      minimum: 1,
                      maximum: 4094
                    },
                    puerto_uplink: {
                      bsonType: "string",
                      minLength: 1,
                      maxLength: 60
                    },
                    equipos_afectados: {
                      bsonType: ["int", "long", "double"],
                      minimum: 1
                    }
                  }
                }
              }
            },
            {
              properties: {
                categoria: {
                  enum: ["infraestructura"]
                },
                detalle_especifico: {
                  bsonType: "object",
                  required: ["tipo_dano", "riesgo_seguridad", "requiere_contratista"],
                  additionalProperties: false,
                  properties: {
                    tipo_dano: {
                      enum: ["filtracion", "luminaria", "climatizacion", "cerradura", "otro"]
                    },
                    riesgo_seguridad: {
                      enum: ["ninguno", "bajo", "medio", "alto"]
                    },
                    requiere_contratista: {
                      bsonType: "bool"
                    },
                    insumos_requeridos: {
                      bsonType: "array",
                      minItems: 1,
                      items: {
                        bsonType: "string",
                        minLength: 1,
                        maxLength: 120
                      }
                    },
                    contratista_externo: {
                      bsonType: "string",
                      minLength: 1,
                      maxLength: 120
                    }
                  }
                }
              }
            },
            {
              properties: {
                categoria: {
                  enum: ["academico"]
                },
                detalle_especifico: {
                  bsonType: "object",
                  required: ["plataforma", "periodo_escolar", "estudiantes_impactados"],
                  additionalProperties: false,
                  properties: {
                    plataforma: {
                      enum: ["lms", "portal_calificaciones", "correo_institucional"]
                    },
                    periodo_escolar: {
                      bsonType: "string",
                      pattern: "^\\d{4}-[1-3]$"
                    },
                    estudiantes_impactados: {
                      bsonType: ["int", "long", "double"],
                      minimum: 1
                    },
                    codigo_curso: {
                      bsonType: "string",
                      minLength: 1,
                      maxLength: 40
                    }
                  }
                }
              }
            }
          ]
        },
        {
          anyOf: [
            {
              properties: {
                estado: {
                  enum: ["abierta", "en proceso", "en espera"]
                }
              }
            },
            {
              required: ["fecha_resolucion"],
              properties: {
                estado: {
                  enum: ["resuelta", "cerrada"]
                }
              }
            }
          ]
        }
      ]
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// --- 2. Índices de incidencias_campus ---
// 2.1 Compuesto { categoria, estado, ubicacion.edificio }   2.2 TTL de 60 días sobre fecha_resolucion
// 2.3 Texto ponderado en español (título pesa 10, descripción 5)
// 2.4 y 2.5: acceso por código y "mis incidencias" (apoyo)
bd.incidencias_campus.createIndex({
  categoria: 1,
  estado: 1,
  "ubicacion.edificio": 1
}, {
  name: "idx_cat_estado_edificio"
});
bd.incidencias_campus.createIndex({
  fecha_resolucion: 1
}, {
  name: "idx_ttl_resolucion",
  expireAfterSeconds: 5184000
});
bd.incidencias_campus.createIndex({
  titulo: "text",
  descripcion: "text"
}, {
  name: "idx_texto_es",
  default_language: "spanish",
  weights: {
    titulo: 10,
    descripcion: 5
  }
});
bd.incidencias_campus.createIndex({
  codigo: 1
}, {
  name: "idx_codigo",
  unique: true
});
bd.incidencias_campus.createIndex({
  "reportante.usuario_id": 1,
  fecha_creacion: -1
}, {
  name: "idx_reportante"
});

// --- 3. Colección usuarios (vacía) ---
bd.createCollection("usuarios");
bd.usuarios.createIndex({
  correo: 1
}, {
  name: "idx_correo_unico",
  unique: true
});

// --- 4. Datos de demostración: 24 incidencias de 3 categorías ---
bd.incidencias_campus.insertMany([
  {
    _id: ObjectId("6ad17a37159cc5b8876c525b"),
    codigo: "INC-2026-0001",
    consecutivo_diario: 1,
    titulo: "Filtración en el techo del aula A-203",
    descripcion: "Gotea agua sobre las bancas del fondo cada vez que llueve; el piso queda resbaloso.",
    categoria: "infraestructura",
    prioridad: "media",
    estado: "resuelta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio A",
      piso: 2,
      espacio: "A-203"
    },
    detalle_especifico: {
      tipo_dano: "filtracion",
      riesgo_seguridad: "medio",
      requiere_contratista: true,
      contratista_externo: "Impermeabilizaciones del Sureste",
      insumos_requeridos: ["impermeabilizante acrílico", "sellador de juntas"]
    },
    tags: ["filtracion", "techo", "recurrente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-14T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-14T05:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Inspección del techo con el contratista",
        horas: 1.5
      },
      {
        fecha: ISODate("2026-09-16T05:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "en espera",
        comentario: "Esperando fecha del contratista",
        horas: 0.5
      },
      {
        fecha: ISODate("2026-09-19T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "en espera",
        estado_nuevo: "en proceso",
        comentario: "El contratista aplicó impermeabilizante",
        horas: 2
      },
      {
        fecha: ISODate("2026-09-20T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Verificado sin goteo después de la lluvia",
        horas: 1
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "foto-techo-a203.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0001/76655582-b407-443d-9710-95b55f30b418-foto-techo-a203.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0001/76655582-b407-443d-9710-95b55f30b418-foto-techo-a203.png",
        url_expira: ISODate("2026-10-16T02:13:21.590Z"),
        fecha_carga: ISODate("2026-09-14T01:43:19.287Z")
      },
      {
        nombre_archivo: "diagnostico-filtracion.pdf",
        tipo_mime: "application/pdf",
        peso_kb: 0.6,
        storage_path: "INC-2026-0001/ec793bc5-2bc0-43b3-be1d-5f06d27dcd2c-diagnostico-filtracion.pdf",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0001/ec793bc5-2bc0-43b3-be1d-5f06d27dcd2c-diagnostico-filtracion.pdf",
        url_expira: ISODate("2026-10-16T02:13:21.890Z"),
        fecha_carga: ISODate("2026-09-14T02:13:19.287Z")
      }
    ],
    horas_invertidas: 5,
    fecha_creacion: ISODate("2026-09-14T01:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-20T01:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    },
    fecha_resolucion: ISODate("2026-09-20T01:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c525c"),
    codigo: "INC-2026-0002",
    consecutivo_diario: 1,
    titulo: "Cuentas de correo institucional bloqueadas (periodo 2026-2)",
    descripcion: "Decenas de estudiantes no pueden iniciar sesión en su correo institucional desde el lunes.",
    categoria: "academico",
    prioridad: "alta",
    estado: "resuelta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
      nombre: "Pedro Canul",
      tipo: "administrativo",
      correo: "pedro.canul@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Administrativo",
      piso: 1,
      espacio: "Coordinación TIC"
    },
    detalle_especifico: {
      plataforma: "correo_institucional",
      periodo_escolar: "2026-2",
      estudiantes_impactados: 85
    },
    tags: ["correo", "acceso", "recurrente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-14T23:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
          nombre: "Pedro Canul"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-15T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Se identificó política de bloqueo por intentos fallidos",
        horas: 1
      },
      {
        fecha: ISODate("2026-09-15T19:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Cuentas desbloqueadas y política ajustada",
        horas: 2
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "bloqueos-correo.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0002/81b00c28-3fa6-4163-82cb-7cf4da08e032-bloqueos-correo.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0002/81b00c28-3fa6-4163-82cb-7cf4da08e032-bloqueos-correo.png",
        url_expira: ISODate("2026-10-16T02:13:22.172Z"),
        fecha_carga: ISODate("2026-09-14T23:43:19.287Z")
      }
    ],
    horas_invertidas: 3,
    fecha_creacion: ISODate("2026-09-14T23:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-15T19:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    },
    fecha_resolucion: ISODate("2026-09-15T19:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c525d"),
    codigo: "INC-2026-0003",
    consecutivo_diario: 1,
    titulo: "Switch del laboratorio LC-2 sin respuesta",
    descripcion: "Desde las 8:00 los equipos del laboratorio no obtienen red ni acceso a internet.",
    categoria: "computo_redes",
    prioridad: "alta",
    estado: "resuelta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Laboratorios de Cómputo",
      piso: 1,
      espacio: "LC-2"
    },
    detalle_especifico: {
      tipo_falla: "switch",
      direccion_ip: "10.20.2.1",
      vlan: 20,
      puerto_uplink: "Gi1/0/24",
      equipos_afectados: 28
    },
    tags: ["switch", "sin-red", "laboratorio", "recurrente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-15T00:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-15T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Revisando el enlace del uplink",
        horas: 1.5
      },
      {
        fecha: ISODate("2026-09-15T05:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Se reemplazó el módulo SFP del uplink",
        horas: 2
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "switch-lc2.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0003/108d8e1c-69b2-43ab-9d69-e813479618fc-switch-lc2.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0003/108d8e1c-69b2-43ab-9d69-e813479618fc-switch-lc2.png",
        url_expira: ISODate("2026-10-16T02:13:22.443Z"),
        fecha_carga: ISODate("2026-09-15T00:43:19.287Z")
      }
    ],
    horas_invertidas: 3.5,
    fecha_creacion: ISODate("2026-09-15T00:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-15T05:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    },
    fecha_resolucion: ISODate("2026-09-15T05:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c525e"),
    codigo: "INC-2026-0004",
    consecutivo_diario: 1,
    titulo: "Luminarias del aula B-101 parpadean",
    descripcion: "Dos luminarias parpadean durante la clase y provocan dolor de cabeza.",
    categoria: "infraestructura",
    prioridad: "baja",
    estado: "cerrada",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
      nombre: "Daniela Chan",
      tipo: "estudiante",
      correo: "daniela.chan@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio B",
      piso: 1,
      espacio: "B-101"
    },
    detalle_especifico: {
      tipo_dano: "luminaria",
      riesgo_seguridad: "bajo",
      requiere_contratista: false
    },
    tags: ["luminaria"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-15T19:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
          nombre: "Daniela Chan"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-16T03:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Se detectó balastro en mal estado",
        horas: 0.5
      },
      {
        fecha: ISODate("2026-09-16T21:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Balastros reemplazados",
        horas: 1
      },
      {
        fecha: ISODate("2026-09-17T11:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5259"),
          nombre: "Roberto Mena"
        },
        estado_anterior: "resuelta",
        estado_nuevo: "cerrada",
        comentario: "Cierre administrativo",
        horas: 0
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "luminarias-b101.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0004/35d32566-a80b-4306-be68-ed43d8d5708e-luminarias-b101.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0004/35d32566-a80b-4306-be68-ed43d8d5708e-luminarias-b101.png",
        url_expira: ISODate("2026-10-16T02:13:22.794Z"),
        fecha_carga: ISODate("2026-09-15T19:43:19.287Z")
      }
    ],
    horas_invertidas: 1.5,
    fecha_creacion: ISODate("2026-09-15T19:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-17T11:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    },
    fecha_resolucion: ISODate("2026-09-16T21:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c525f"),
    codigo: "INC-2026-0005",
    consecutivo_diario: 1,
    titulo: "Error al asentar actas en el portal de calificaciones",
    descripcion: "El portal marca error 500 al guardar calificaciones y el cierre de actas vence hoy.",
    categoria: "academico",
    prioridad: "critica",
    estado: "resuelta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio A",
      piso: 1,
      espacio: "Sala de profesores"
    },
    detalle_especifico: {
      plataforma: "portal_calificaciones",
      periodo_escolar: "2026-2",
      estudiantes_impactados: 210,
      codigo_curso: "PRG-210"
    },
    tags: ["portal", "calificaciones", "urgente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-15T20:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-15T21:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Error por tabla de bitácora llena",
        horas: 2
      },
      {
        fecha: ISODate("2026-09-16T03:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Se depuró la tabla y se reanudó el servicio",
        horas: 4
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "error-500.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0005/1ab60dfc-b41d-4cbf-b20c-58787ed6da0c-error-500.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0005/1ab60dfc-b41d-4cbf-b20c-58787ed6da0c-error-500.png",
        url_expira: ISODate("2026-10-16T02:13:23.140Z"),
        fecha_carga: ISODate("2026-09-15T20:43:19.287Z")
      },
      {
        nombre_archivo: "reporte-incidente-portal.pdf",
        tipo_mime: "application/pdf",
        peso_kb: 0.6,
        storage_path: "INC-2026-0005/16312bb6-1cc4-4714-b21c-bbef62c92701-reporte-incidente-portal.pdf",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0005/16312bb6-1cc4-4714-b21c-bbef62c92701-reporte-incidente-portal.pdf",
        url_expira: ISODate("2026-10-16T02:13:23.413Z"),
        fecha_carga: ISODate("2026-09-15T21:13:19.287Z")
      }
    ],
    horas_invertidas: 6,
    fecha_creacion: ISODate("2026-09-15T20:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-16T03:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    },
    fecha_resolucion: ISODate("2026-09-16T03:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5260"),
    codigo: "INC-2026-0006",
    consecutivo_diario: 1,
    titulo: "Sin red en la planta alta del Edificio B",
    descripcion: "Las aulas de la planta alta no tienen red cableada ni Wi-Fi desde la mañana.",
    categoria: "computo_redes",
    prioridad: "media",
    estado: "cerrada",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
      nombre: "Daniela Chan",
      tipo: "estudiante",
      correo: "daniela.chan@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio B",
      piso: 2,
      espacio: "Gabinete de comunicaciones"
    },
    detalle_especifico: {
      tipo_falla: "switch",
      direccion_ip: "10.20.5.1",
      vlan: 50,
      puerto_uplink: "Gi1/0/24",
      equipos_afectados: 18
    },
    tags: ["switch", "sin-red"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-18T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
          nombre: "Daniela Chan"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-18T04:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Se localizó un cable de fibra dañado",
        horas: 2
      },
      {
        fecha: ISODate("2026-09-18T15:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Se tendió fibra nueva",
        horas: 3
      },
      {
        fecha: ISODate("2026-09-19T13:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5259"),
          nombre: "Roberto Mena"
        },
        estado_anterior: "resuelta",
        estado_nuevo: "cerrada",
        comentario: "Cierre administrativo",
        horas: 0
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "fibra-danada.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0006/7ad39672-1e7a-4a6e-a393-ec8c19193159-fibra-danada.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0006/7ad39672-1e7a-4a6e-a393-ec8c19193159-fibra-danada.png",
        url_expira: ISODate("2026-10-16T02:13:23.688Z"),
        fecha_carga: ISODate("2026-09-18T01:43:19.287Z")
      }
    ],
    horas_invertidas: 5,
    fecha_creacion: ISODate("2026-09-18T01:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-19T13:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    },
    fecha_resolucion: ISODate("2026-09-18T15:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5261"),
    codigo: "INC-2026-0007",
    consecutivo_diario: 1,
    titulo: "El correo institucional no recibe mensajes externos",
    descripcion: "No llegan correos de dominios externos a las cuentas del personal docente.",
    categoria: "academico",
    prioridad: "media",
    estado: "cerrada",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio A",
      piso: 1,
      espacio: "Sala de profesores"
    },
    detalle_especifico: {
      plataforma: "correo_institucional",
      periodo_escolar: "2026-2",
      estudiantes_impactados: 60
    },
    tags: ["correo"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-19T00:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-19T04:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Registros MX con valor antiguo",
        horas: 1
      },
      {
        fecha: ISODate("2026-09-19T18:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Registros DNS corregidos",
        horas: 1
      },
      {
        fecha: ISODate("2026-09-20T16:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5259"),
          nombre: "Roberto Mena"
        },
        estado_anterior: "resuelta",
        estado_nuevo: "cerrada",
        comentario: "Cierre administrativo",
        horas: 0
      }
    ],
    evidencias_adjuntas: [],
    horas_invertidas: 2,
    fecha_creacion: ISODate("2026-09-19T00:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-20T16:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    },
    fecha_resolucion: ISODate("2026-09-19T18:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5262"),
    codigo: "INC-2026-0008",
    consecutivo_diario: 1,
    titulo: "Vuelve la filtración en el aula A-203",
    descripcion: "La gotera reapareció en la misma esquina del techo, ahora con manchas de humedad en el muro.",
    categoria: "infraestructura",
    prioridad: "alta",
    estado: "cerrada",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio A",
      piso: 2,
      espacio: "A-203"
    },
    detalle_especifico: {
      tipo_dano: "filtracion",
      riesgo_seguridad: "medio",
      requiere_contratista: true,
      contratista_externo: "Impermeabilizaciones del Sureste",
      insumos_requeridos: ["sellador de juntas"]
    },
    tags: ["filtracion", "techo", "recurrente", "urgente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-21T00:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-21T02:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Se revisó la junta de la azotea",
        horas: 1
      },
      {
        fecha: ISODate("2026-09-22T06:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Se selló la junta y se secó el muro",
        horas: 3
      },
      {
        fecha: ISODate("2026-09-23T02:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5259"),
          nombre: "Roberto Mena"
        },
        estado_anterior: "resuelta",
        estado_nuevo: "cerrada",
        comentario: "Cierre administrativo",
        horas: 0
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "humedad-muro-a203.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0008/82394266-ba31-46ef-be85-8a8f5c472892-humedad-muro-a203.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0008/82394266-ba31-46ef-be85-8a8f5c472892-humedad-muro-a203.png",
        url_expira: ISODate("2026-10-16T02:13:24.129Z"),
        fecha_carga: ISODate("2026-09-21T00:43:19.287Z")
      }
    ],
    horas_invertidas: 4,
    fecha_creacion: ISODate("2026-09-21T00:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-23T02:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    },
    fecha_resolucion: ISODate("2026-09-22T06:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5263"),
    codigo: "INC-2026-0009",
    consecutivo_diario: 1,
    titulo: "No carga el aula virtual en Matemáticas",
    descripcion: "El curso de Matemáticas muestra pantalla en blanco al abrir las actividades.",
    categoria: "academico",
    prioridad: "media",
    estado: "cerrada",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio B",
      piso: 1,
      espacio: "B-102"
    },
    detalle_especifico: {
      plataforma: "lms",
      periodo_escolar: "2026-3",
      estudiantes_impactados: 38,
      codigo_curso: "MAT-301"
    },
    tags: ["lms", "aula-virtual"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-23T21:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-24T00:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Curso con caché dañada",
        horas: 1
      },
      {
        fecha: ISODate("2026-09-24T22:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Caché reconstruida",
        horas: 1.5
      },
      {
        fecha: ISODate("2026-09-25T18:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5259"),
          nombre: "Roberto Mena"
        },
        estado_anterior: "resuelta",
        estado_nuevo: "cerrada",
        comentario: "Cierre administrativo",
        horas: 0
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "pantalla-en-blanco.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0009/3d09b9e4-a06e-4332-9c68-d6425e794fec-pantalla-en-blanco.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0009/3d09b9e4-a06e-4332-9c68-d6425e794fec-pantalla-en-blanco.png",
        url_expira: ISODate("2026-10-16T02:13:24.413Z"),
        fecha_carga: ISODate("2026-09-23T21:43:19.287Z")
      }
    ],
    horas_invertidas: 2.5,
    fecha_creacion: ISODate("2026-09-23T21:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-25T18:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    },
    fecha_resolucion: ISODate("2026-09-24T22:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5264"),
    codigo: "INC-2026-0010",
    consecutivo_diario: 1,
    titulo: "El switch del LC-2 vuelve a fallar",
    descripcion: "Otra vez sin red en el laboratorio LC-2; el problema aparece cada par de semanas.",
    categoria: "computo_redes",
    prioridad: "alta",
    estado: "cerrada",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Laboratorios de Cómputo",
      piso: 1,
      espacio: "LC-2"
    },
    detalle_especifico: {
      tipo_falla: "switch",
      direccion_ip: "10.20.2.1",
      vlan: 20,
      puerto_uplink: "Gi1/0/24",
      equipos_afectados: 26
    },
    tags: ["switch", "laboratorio", "recurrente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-25T23:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-26T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Se detectó sobrecalentamiento del equipo",
        horas: 1
      },
      {
        fecha: ISODate("2026-09-26T09:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Se agregó ventilación al gabinete",
        horas: 2.5
      },
      {
        fecha: ISODate("2026-09-27T05:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5259"),
          nombre: "Roberto Mena"
        },
        estado_anterior: "resuelta",
        estado_nuevo: "cerrada",
        comentario: "Cierre administrativo",
        horas: 0
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "gabinete-lc2.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0010/6a258a69-8021-4f86-8e36-a72a23e8664b-gabinete-lc2.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0010/6a258a69-8021-4f86-8e36-a72a23e8664b-gabinete-lc2.png",
        url_expira: ISODate("2026-10-16T02:13:24.689Z"),
        fecha_carga: ISODate("2026-09-25T23:43:19.287Z")
      }
    ],
    horas_invertidas: 3.5,
    fecha_creacion: ISODate("2026-09-25T23:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-27T05:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    },
    fecha_resolucion: ISODate("2026-09-26T09:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5265"),
    codigo: "INC-2026-0011",
    consecutivo_diario: 1,
    titulo: "Servidor de archivos local caído",
    descripcion: "No se puede abrir ninguna carpeta compartida del área administrativa desde las 7:30.",
    categoria: "computo_redes",
    prioridad: "critica",
    estado: "resuelta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
      nombre: "Pedro Canul",
      tipo: "administrativo",
      correo: "pedro.canul@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Administrativo",
      piso: 1,
      espacio: "Cuarto de servidores"
    },
    detalle_especifico: {
      tipo_falla: "servidor",
      direccion_ip: "10.20.1.10",
      vlan: 10,
      puerto_uplink: "Gi1/0/1",
      equipos_afectados: 45
    },
    tags: ["servidor", "urgente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-09-27T21:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
          nombre: "Pedro Canul"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-09-27T22:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Disco del arreglo RAID degradado",
        horas: 3
      },
      {
        fecha: ISODate("2026-09-28T06:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5259"),
          nombre: "Roberto Mena"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Disco reemplazado y arreglo reconstruido",
        horas: 6
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "raid-degradado.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0011/9588d896-0cef-488f-836a-64af7ae765f1-raid-degradado.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0011/9588d896-0cef-488f-836a-64af7ae765f1-raid-degradado.png",
        url_expira: ISODate("2026-10-16T02:13:24.991Z"),
        fecha_carga: ISODate("2026-09-27T21:43:19.287Z")
      },
      {
        nombre_archivo: "informe-servidor.pdf",
        tipo_mime: "application/pdf",
        peso_kb: 0.6,
        storage_path: "INC-2026-0011/2cbb1be7-863b-4e44-bdb2-311df67c4b7f-informe-servidor.pdf",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0011/2cbb1be7-863b-4e44-bdb2-311df67c4b7f-informe-servidor.pdf",
        url_expira: ISODate("2026-10-16T02:13:25.359Z"),
        fecha_carga: ISODate("2026-09-27T22:13:19.287Z")
      }
    ],
    horas_invertidas: 9,
    fecha_creacion: ISODate("2026-09-27T21:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-09-28T06:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    },
    fecha_resolucion: ISODate("2026-09-28T06:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5266"),
    codigo: "INC-2026-0012",
    consecutivo_diario: 1,
    titulo: "Portal de calificaciones muy lento en horas pico",
    descripcion: "Entre las 10 y las 12 el portal tarda más de un minuto en responder.",
    categoria: "academico",
    prioridad: "baja",
    estado: "en espera",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
      nombre: "Pedro Canul",
      tipo: "administrativo",
      correo: "pedro.canul@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Administrativo",
      piso: 1,
      espacio: "Control escolar"
    },
    detalle_especifico: {
      plataforma: "portal_calificaciones",
      periodo_escolar: "2026-3",
      estudiantes_impactados: 300
    },
    tags: ["portal", "rendimiento"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-01T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
          nombre: "Pedro Canul"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-10-01T06:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Medición de consultas lentas",
        horas: 1
      },
      {
        fecha: ISODate("2026-10-03T13:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "en espera",
        comentario: "Pendiente de ampliar recursos del servidor",
        horas: 0.5
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "tiempos-respuesta.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0012/f1d76398-b55b-45cf-9d00-f4b8e4881287-tiempos-respuesta.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0012/f1d76398-b55b-45cf-9d00-f4b8e4881287-tiempos-respuesta.png",
        url_expira: ISODate("2026-10-16T02:13:25.635Z"),
        fecha_carga: ISODate("2026-10-01T01:43:19.287Z")
      }
    ],
    horas_invertidas: 1.5,
    fecha_creacion: ISODate("2026-10-01T01:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-03T13:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    }
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5267"),
    codigo: "INC-2026-0013",
    consecutivo_diario: 1,
    titulo: "Cerradura dañada en la puerta del laboratorio LC-1",
    descripcion: "La puerta no asegura y el laboratorio queda abierto fuera de horario.",
    categoria: "infraestructura",
    prioridad: "media",
    estado: "resuelta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Laboratorios de Cómputo",
      piso: 1,
      espacio: "LC-1"
    },
    detalle_especifico: {
      tipo_dano: "cerradura",
      riesgo_seguridad: "medio",
      requiere_contratista: false,
      insumos_requeridos: ["cerradura de embutir"]
    },
    tags: ["cerradura", "seguridad"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-01T20:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-10-02T02:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Se retiró la cerradura dañada",
        horas: 1
      },
      {
        fecha: ISODate("2026-10-02T18:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "resuelta",
        comentario: "Cerradura nueva instalada y probada",
        horas: 1.5
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "cerradura-lc1.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0013/5fb00a23-b979-4e3c-8488-b1112947e8d1-cerradura-lc1.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0013/5fb00a23-b979-4e3c-8488-b1112947e8d1-cerradura-lc1.png",
        url_expira: ISODate("2026-10-16T02:13:25.937Z"),
        fecha_carga: ISODate("2026-10-01T20:43:19.287Z")
      }
    ],
    horas_invertidas: 2.5,
    fecha_creacion: ISODate("2026-10-01T20:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-02T18:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    },
    fecha_resolucion: ISODate("2026-10-02T18:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5268"),
    codigo: "INC-2026-0014",
    consecutivo_diario: 1,
    titulo: "Wi-Fi intermitente en la Biblioteca",
    descripcion: "La señal se cae cada pocos minutos en la sala de lectura y no se pueden consultar bases de datos.",
    categoria: "computo_redes",
    prioridad: "media",
    estado: "en espera",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
      nombre: "Daniela Chan",
      tipo: "estudiante",
      correo: "daniela.chan@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Biblioteca",
      piso: 1,
      espacio: "Sala de lectura"
    },
    detalle_especifico: {
      tipo_falla: "access_point",
      direccion_ip: "10.20.4.21",
      vlan: 40,
      puerto_uplink: "Gi1/0/8",
      equipos_afectados: 30
    },
    tags: ["wifi", "access-point", "biblioteca"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-03T20:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
          nombre: "Daniela Chan"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-10-04T02:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Medición de interferencia con otros equipos",
        horas: 1
      },
      {
        fecha: ISODate("2026-10-05T20:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "en espera",
        comentario: "Esperando ventana de mantenimiento",
        horas: 0.5
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "mapa-senal-biblioteca.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0014/8aa42f90-6719-4e9a-9e65-6c184358c791-mapa-senal-biblioteca.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0014/8aa42f90-6719-4e9a-9e65-6c184358c791-mapa-senal-biblioteca.png",
        url_expira: ISODate("2026-10-16T02:13:26.198Z"),
        fecha_carga: ISODate("2026-10-03T20:43:19.287Z")
      }
    ],
    horas_invertidas: 1.5,
    fecha_creacion: ISODate("2026-10-03T20:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-05T20:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    }
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5269"),
    codigo: "INC-2026-0015",
    consecutivo_diario: 1,
    titulo: "Aire acondicionado sin enfriar en la sala de juntas",
    descripcion: "El equipo prende pero no enfría; la sala llega a más de 30 grados en las reuniones.",
    categoria: "infraestructura",
    prioridad: "media",
    estado: "en espera",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
      nombre: "Pedro Canul",
      tipo: "administrativo",
      correo: "pedro.canul@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Administrativo",
      piso: 2,
      espacio: "Sala de juntas"
    },
    detalle_especifico: {
      tipo_dano: "climatizacion",
      riesgo_seguridad: "ninguno",
      requiere_contratista: true,
      contratista_externo: "Clima Total Mérida",
      insumos_requeridos: ["gas refrigerante R410A"]
    },
    tags: ["climatizacion", "sin-refaccion"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-06T21:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
          nombre: "Pedro Canul"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-10-07T02:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Diagnóstico: fuga de refrigerante",
        horas: 1
      },
      {
        fecha: ISODate("2026-10-08T03:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "en proceso",
        estado_nuevo: "en espera",
        comentario: "Esperando la refacción del proveedor",
        horas: 0.5
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "unidad-exterior.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0015/cad84da4-5b5b-4c02-9e2e-a57f0f54ade9-unidad-exterior.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0015/cad84da4-5b5b-4c02-9e2e-a57f0f54ade9-unidad-exterior.png",
        url_expira: ISODate("2026-10-16T02:13:26.520Z"),
        fecha_carga: ISODate("2026-10-06T21:43:19.287Z")
      }
    ],
    horas_invertidas: 1.5,
    fecha_creacion: ISODate("2026-10-06T21:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-08T03:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    }
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c526a"),
    codigo: "INC-2026-0016",
    consecutivo_diario: 1,
    titulo: "Access point del Edificio A sin señal",
    descripcion: "El pasillo y las aulas del primer piso del Edificio A no tienen cobertura Wi-Fi.",
    categoria: "computo_redes",
    prioridad: "alta",
    estado: "en proceso",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
      nombre: "Pedro Canul",
      tipo: "administrativo",
      correo: "pedro.canul@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio A",
      piso: 1,
      espacio: "Pasillo"
    },
    detalle_especifico: {
      tipo_falla: "access_point",
      direccion_ip: "10.20.6.14",
      vlan: 60,
      puerto_uplink: "Gi1/0/3",
      equipos_afectados: 40
    },
    tags: ["wifi", "access-point"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-09T00:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
          nombre: "Pedro Canul"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-10-09T03:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
          nombre: "Marisol Be"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Reinicio de controlador sin éxito, se prueba otro AP",
        horas: 1.5
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "controlador-wifi.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0016/25f31d0f-0338-4c96-a3b3-383273d671e9-controlador-wifi.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0016/25f31d0f-0338-4c96-a3b3-383273d671e9-controlador-wifi.png",
        url_expira: ISODate("2026-10-16T02:13:26.871Z"),
        fecha_carga: ISODate("2026-10-09T00:43:19.287Z")
      }
    ],
    horas_invertidas: 1.5,
    fecha_creacion: ISODate("2026-10-09T00:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-09T03:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5258"),
      nombre: "Marisol Be"
    }
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c526b"),
    codigo: "INC-2026-0017",
    consecutivo_diario: 1,
    titulo: "Cuentas de correo institucional bloqueadas (periodo 2026-3)",
    descripcion: "Al inicio del periodo se bloquearon otra vez las cuentas de nuevo ingreso.",
    categoria: "academico",
    prioridad: "alta",
    estado: "en proceso",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
      nombre: "Daniela Chan",
      tipo: "estudiante",
      correo: "daniela.chan@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Administrativo",
      piso: 1,
      espacio: "Coordinación TIC"
    },
    detalle_especifico: {
      plataforma: "correo_institucional",
      periodo_escolar: "2026-3",
      estudiantes_impactados: 120
    },
    tags: ["correo", "acceso", "recurrente", "urgente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-09T22:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
          nombre: "Daniela Chan"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-10-10T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Revisando importación masiva de cuentas",
        horas: 1.5
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "alta-masiva.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0017/39dba258-b0cb-4120-beb0-f0009ce45983-alta-masiva.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0017/39dba258-b0cb-4120-beb0-f0009ce45983-alta-masiva.png",
        url_expira: ISODate("2026-10-16T02:13:27.149Z"),
        fecha_carga: ISODate("2026-10-09T22:43:19.287Z")
      }
    ],
    horas_invertidas: 1.5,
    fecha_creacion: ISODate("2026-10-09T22:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-10T01:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    }
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c526c"),
    codigo: "INC-2026-0018",
    consecutivo_diario: 1,
    titulo: "Access point del LC-2 desconectado",
    descripcion: "El punto de acceso Wi-Fi del laboratorio no aparece en la red y los alumnos no se conectan.",
    categoria: "computo_redes",
    prioridad: "media",
    estado: "en proceso",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Laboratorios de Cómputo",
      piso: 1,
      espacio: "LC-2"
    },
    detalle_especifico: {
      tipo_falla: "access_point",
      direccion_ip: "10.20.2.15",
      vlan: 20,
      puerto_uplink: "Gi1/0/12",
      equipos_afectados: 12
    },
    tags: ["access-point", "wifi", "laboratorio", "recurrente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-10T22:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-10-11T02:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Revisando alimentación PoE del puerto",
        horas: 1
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "ap-lc2.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0018/f843e353-8b7a-44ef-8b9e-e9b8b82c9293-ap-lc2.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0018/f843e353-8b7a-44ef-8b9e-e9b8b82c9293-ap-lc2.png",
        url_expira: ISODate("2026-10-16T02:13:27.424Z"),
        fecha_carga: ISODate("2026-10-10T22:43:19.287Z")
      }
    ],
    horas_invertidas: 1,
    fecha_creacion: ISODate("2026-10-10T22:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-11T02:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    }
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c526d"),
    codigo: "INC-2026-0019",
    consecutivo_diario: 1,
    titulo: "Equipo del laboratorio LC-3 no enciende",
    descripcion: "La computadora de la estación 12 no enciende aunque el cable de corriente está conectado.",
    categoria: "computo_redes",
    prioridad: "baja",
    estado: "abierta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Laboratorios de Cómputo",
      piso: 1,
      espacio: "LC-3"
    },
    detalle_especifico: {
      tipo_falla: "equipo_laboratorio",
      direccion_ip: "10.20.3.33",
      vlan: 30,
      puerto_uplink: "Gi1/0/5",
      equipos_afectados: 1
    },
    tags: ["equipo-laboratorio"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-11T19:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      }
    ],
    evidencias_adjuntas: [],
    horas_invertidas: 0,
    fecha_creacion: ISODate("2026-10-11T19:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-11T19:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c526e"),
    codigo: "INC-2026-0020",
    consecutivo_diario: 1,
    titulo: "Luminaria fundida en el pasillo de la Biblioteca",
    descripcion: "El tubo LED del pasillo central no enciende y la zona queda oscura por las tardes.",
    categoria: "infraestructura",
    prioridad: "baja",
    estado: "abierta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
      nombre: "Pedro Canul",
      tipo: "administrativo",
      correo: "pedro.canul@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Biblioteca",
      piso: 1,
      espacio: "Pasillo central"
    },
    detalle_especifico: {
      tipo_dano: "luminaria",
      riesgo_seguridad: "bajo",
      requiere_contratista: false,
      insumos_requeridos: ["tubo LED 18W"]
    },
    tags: ["luminaria", "biblioteca"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-12T22:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5256"),
          nombre: "Pedro Canul"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      }
    ],
    evidencias_adjuntas: [],
    horas_invertidas: 0,
    fecha_creacion: ISODate("2026-10-12T22:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-12T22:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c526f"),
    codigo: "INC-2026-0021",
    consecutivo_diario: 1,
    titulo: "El aula virtual no muestra las tareas de Bases de Datos",
    descripcion: "Los alumnos no ven las tareas de la semana en el curso de Bases de Datos.",
    categoria: "academico",
    prioridad: "media",
    estado: "abierta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
      nombre: "Daniela Chan",
      tipo: "estudiante",
      correo: "daniela.chan@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio B",
      piso: 2,
      espacio: "B-205"
    },
    detalle_especifico: {
      plataforma: "lms",
      periodo_escolar: "2026-3",
      estudiantes_impactados: 27,
      codigo_curso: "BDN-305"
    },
    tags: ["lms", "aula-virtual"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-13T19:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
          nombre: "Daniela Chan"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      }
    ],
    evidencias_adjuntas: [],
    horas_invertidas: 0,
    fecha_creacion: ISODate("2026-10-13T19:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-13T19:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5270"),
    codigo: "INC-2026-0022",
    consecutivo_diario: 1,
    titulo: "Nueva filtración en el aula A-203 tras la tormenta",
    descripcion: "Escurre agua junto a una luminaria; se suspendieron las clases del aula por seguridad.",
    categoria: "infraestructura",
    prioridad: "critica",
    estado: "en proceso",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
      nombre: "Mtra. Ana Pech",
      tipo: "docente",
      correo: "ana.pech@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio A",
      piso: 2,
      espacio: "A-203"
    },
    detalle_especifico: {
      tipo_dano: "filtracion",
      riesgo_seguridad: "alto",
      requiere_contratista: true,
      contratista_externo: "Impermeabilizaciones del Sureste",
      insumos_requeridos: ["impermeabilizante acrílico", "luminaria LED de repuesto"]
    },
    tags: ["filtracion", "techo", "recurrente", "urgente"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-13T23:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5254"),
          nombre: "Mtra. Ana Pech"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      },
      {
        fecha: ISODate("2026-10-14T02:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
          nombre: "Luis Cauich"
        },
        estado_anterior: "abierta",
        estado_nuevo: "en proceso",
        comentario: "Se cortó la energía del circuito y se colocó cubeta",
        horas: 2
      }
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: "luminaria-mojada.png",
        tipo_mime: "image/png",
        peso_kb: 1.02,
        storage_path: "INC-2026-0022/fa2e5358-134d-4e80-93c5-73964a7c3118-luminaria-mojada.png",
        url_storage: "https://cyqotsdyewybylwucduu.supabase.co/storage/v1/object/sign/evidencias/INC-2026-0022/fa2e5358-134d-4e80-93c5-73964a7c3118-luminaria-mojada.png",
        url_expira: ISODate("2026-10-16T02:13:27.714Z"),
        fecha_carga: ISODate("2026-10-13T23:43:19.287Z")
      }
    ],
    horas_invertidas: 2,
    fecha_creacion: ISODate("2026-10-13T23:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-14T02:13:19.287Z"),
    asignado_a: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5257"),
      nombre: "Luis Cauich"
    }
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5271"),
    codigo: "INC-2026-0023",
    consecutivo_diario: 1,
    titulo: "Los videos del aula virtual no se reproducen",
    descripcion: "Los videos de las clases muestran un círculo de carga y nunca inician.",
    categoria: "academico",
    prioridad: "baja",
    estado: "abierta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
      nombre: "Daniela Chan",
      tipo: "estudiante",
      correo: "daniela.chan@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Biblioteca",
      piso: 1,
      espacio: "Sala de cómputo"
    },
    detalle_especifico: {
      plataforma: "lms",
      periodo_escolar: "2026-3",
      estudiantes_impactados: 45,
      codigo_curso: "SIS-110"
    },
    tags: ["lms", "video"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-14T23:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
          nombre: "Daniela Chan"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      }
    ],
    evidencias_adjuntas: [],
    horas_invertidas: 0,
    fecha_creacion: ISODate("2026-10-14T23:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-14T23:13:19.287Z")
  },
  {
    _id: ObjectId("6ad17a37159cc5b8876c5272"),
    codigo: "INC-2026-0024",
    consecutivo_diario: 1,
    titulo: "La puerta del aula B-204 no cierra",
    descripcion: "La puerta quedó desalineada y no cierra; el aula no se puede asegurar al terminar el día.",
    categoria: "infraestructura",
    prioridad: "alta",
    estado: "abierta",
    reportante: {
      usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
      nombre: "Daniela Chan",
      tipo: "estudiante",
      correo: "daniela.chan@utmetropolitana.edu.mx"
    },
    ubicacion: {
      edificio: "Edificio B",
      piso: 2,
      espacio: "B-204"
    },
    detalle_especifico: {
      tipo_dano: "otro",
      riesgo_seguridad: "bajo",
      requiere_contratista: false
    },
    tags: ["puerta", "seguridad"],
    historial_seguimiento: [
      {
        fecha: ISODate("2026-10-15T01:13:19.287Z"),
        autor: {
          usuario_id: ObjectId("6ad17a30159cc5b8876c5255"),
          nombre: "Daniela Chan"
        },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0
      }
    ],
    evidencias_adjuntas: [],
    horas_invertidas: 0,
    fecha_creacion: ISODate("2026-10-15T01:13:19.287Z"),
    fecha_actualizacion: ISODate("2026-10-15T01:13:19.287Z")
  }
]);

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
//    descomenta el bloque para probarlos sobre INC-2026-0016.
// =============================================================================
/*
// CU-03 — un solo updateOne atómico: $set (estado) + $push (bitácora) + $inc (horas)
bd.incidencias_campus.updateOne(
  { codigo: "INC-2026-0016", estado: "en proceso" },
  {
    $set: { estado: "en espera", fecha_actualizacion: new Date() },
    $push: {
      historial_seguimiento: {
        fecha: new Date(),
        autor: { usuario_id: ObjectId(), nombre: "Técnico de demostración" },
        estado_anterior: "en proceso",
        estado_nuevo: "en espera",
        comentario: "Esperando refacción",
        horas: 1.5
      }
    },
    $inc: { horas_invertidas: 1.5 }
  }
);

// CU-04 — etiquetas sin duplicados: $addToSet y $pull
bd.incidencias_campus.updateOne({ codigo: "INC-2026-0016" }, { $addToSet: { tags: "revisar" } });
bd.incidencias_campus.updateOne({ codigo: "INC-2026-0016" }, { $pull: { tags: "revisar" } });

// CU-02 — evidencia: $push al arreglo evidencias_adjuntas (solo metadatos; el archivo vive en el bucket)
bd.incidencias_campus.updateOne(
  { codigo: "INC-2026-0016" },
  {
    $push: {
      evidencias_adjuntas: {
        nombre_archivo: "captura.png",
        tipo_mime: "image/png",
        peso_kb: 120.5,
        storage_path: "INC-2026-0016/captura.png",
        url_storage: "https://ejemplo.invalid/firmada",
        url_expira: new Date(Date.now() + 3600 * 1000),
        fecha_carga: new Date()
      }
    }
  }
);
*/

print("Script maestro completo en la base " + NOMBRE_BD);
