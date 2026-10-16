# Verificación en Atlas (R04)

Generado el 2026-10-16 con `node scripts/db-explain.js` (solo lectura) sobre la base `utmdesk`. Las capturas de pantalla de Atlas (D03) se toman a mano con la sesión de Kevin.

## Índices de incidencias_campus
- _id_: {"_id":1}
- idx_cat_estado_edificio: {"categoria":1,"estado":1,"ubicacion.edificio":1}
- idx_ttl_resolucion: {"fecha_resolucion":1} (TTL 5184000s)
- idx_texto_es: {"_fts":"text","_ftsx":1} (idioma spanish)
- idx_codigo: {"codigo":1} (único)
- idx_reportante: {"reportante.usuario_id":1,"fecha_creacion":-1}

## Validador
- validationLevel: strict, validationAction: error
- bsonType raíz: object, requeridos: codigo, consecutivo_diario, titulo, descripcion, categoria, prioridad, estado, reportante, ubicacion, detalle_especifico, tags, historial_seguimiento, evidencias_adjuntas, horas_invertidas, fecha_creacion, fecha_actualizacion

## Planes de ejecución (explain executionStats)
- Listado filtrado (categoría + estado + edificio): FETCH → IXSCAN(idx_cat_estado_edificio) · examinados 0 docs / 0 claves · devueltos 0
- Búsqueda de texto «filtración»: TEXT_MATCH(idx_texto_es) → FETCH → IXSCAN(idx_texto_es) · examinados 3 docs / 3 claves · devueltos 3
- Código único: EXPRESS_IXSCAN(idx_codigo) · examinados 1 docs / 1 claves · devueltos 1
- Mis incidencias (reportante): FETCH → IXSCAN(idx_reportante) · examinados 11 docs / 11 claves · devueltos 11
