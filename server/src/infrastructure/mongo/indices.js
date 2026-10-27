// Índices del plan §4.5. Los nombres son parte del contrato (los tests y explain() los usan).
export const indicesIncidencias = [
  { name: "idx_cat_estado_edificio", key: { categoria: 1, estado: 1, "ubicacion.edificio": 1 } },
  { name: "idx_ttl_resolucion", key: { fecha_resolucion: 1 }, expireAfterSeconds: 5184000 }, // 60 días
  {
    name: "idx_texto_es",
    key: { titulo: "text", descripcion: "text" },
    default_language: "spanish",
    weights: { titulo: 10, descripcion: 5 },
  },
  { name: "idx_codigo", key: { codigo: 1 }, unique: true },
  { name: "idx_reportante", key: { "reportante.usuario_id": 1, fecha_creacion: -1 } },
];

export const indicesUsuarios = [{ name: "idx_correo_unico", key: { correo: 1 }, unique: true }];

// Bitácora administrativa: consulta más reciente primero, y por usuario.
export const indicesBitacoraAdmin = [
  { name: "idx_bitacora_fecha", key: { fecha: -1 } },
  { name: "idx_bitacora_usuario_fecha", key: { usuario_id: 1, fecha: -1 } },
];
