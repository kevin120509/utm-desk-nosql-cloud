# Guía de defensa por integrante (D04)

Proyecto: UTM Desk NoSQL Cloud · Bases de Datos en la Nube, Unidad II · Docente: Lizandro Israel Reyes Carrillo.

El docente puede pedir tres cosas para comprobar que cada integrante sabe lo que hizo: **explicar** una parte, **cambiar** algo en vivo (mover, agregar o quitar una regla) y **probar** que sigue funcionando. Esta guía reparte el proyecto por caso de uso (los siete del enunciado), da un guion corto para cada quien, las preguntas probables con su respuesta, los cambios que podrían pedirle y cómo comprobarlos.

## 1. Reparto

| Integrante | Parte que defiende | Casos de uso del enunciado | Pantallas |
|---|---|---|---|
| Vargas Guzmán Kevin Aarón | Arquitectura, alta de incidencias, contador, seguridad y despliegue | CU-01 | Login, lista, nueva incidencia |
| Arroyo León Luis Diego | Estado, bitácora, concurrencia, roles y banco de pruebas | CU-03 | Detalle (actualizar estado), panel Administrar |
| Can Domínguez Víctor Emmanuel | Evidencias en Supabase y etiquetas | CU-02 y CU-04 | Detalle (evidencias y etiquetas) |
| Montalvo Canché Emir Emanuel | Búsqueda, analítica, índices, TTL, datos de ejemplo y scripts de base de datos | CU-05, CU-06 y CU-07 | Buscador, analítica |

Cada integrante debe conocer a grandes rasgos las partes de los demás (sección 7) y poder abrir la suya en el código sin buscar.

## 2. Mapa rápido: «muéstrame dónde…» → archivo

Todos los archivos de servidor están bajo `server/src/`.

| Pregunta | Archivo |
|---|---|
| ¿Dónde se valida el cuerpo del alta? | `domain/esquemas.js` (Zod) y `infrastructure/mongo/validador.js` (`$jsonSchema`) |
| ¿Dónde están los estados, prioridades y categorías? | `domain/enumeraciones.js` |
| ¿Qué transiciones de estado existen? | `domain/transiciones.js` |
| ¿Cómo se genera `INC-AAAA-NNNN`? | `domain/codigo.js` y `infrastructure/mongo/contadorMongo.js` |
| ¿Dónde está el cambio de estado atómico? | `application/actualizarEstado.js` y `infrastructure/mongo/incidenciasRepo.js` (método `actualizarEstado`) |
| ¿Cómo se valida el tipo real de archivo? | `infrastructure/archivos/detectarTipo.js` y `domain/evidencia.js` |
| ¿Cómo se sube a Supabase? | `infrastructure/almacen/almacenSupabase.js` y `application/cargarEvidencia.js` |
| ¿Dónde se agregan y quitan etiquetas? | `application/gestionarEtiquetas.js` y `infrastructure/mongo/etiquetasRepo.js` |
| ¿Dónde está la búsqueda de texto? | `application/buscarIncidencias.js` y `incidenciasRepo.js` |
| ¿Dónde están los pipelines? | `infrastructure/mongo/analiticaRepo.js` |
| ¿Dónde están los índices? | `infrastructure/mongo/indices.js` |
| ¿Cómo se protege el inicio de sesión? | `application/autenticar.js`, `interface/http/middlewares/limites.js`, `infrastructure/seguridad/` |
| ¿Dónde se arma la aplicación? | `aplicacion.js` (composición) y `interface/http/app.js` |
| ¿Cómo se despliega en Vercel? | `server/api/index.js`, `server/vercel.json`, `web/vercel.json` |
| Catálogos de la interfaz (edificios, categorías) | `web/src/catalogo.js` |

## 3. Comandos para probar (desde `server/`)

```bash
npm test                                   # 351 pruebas, contra Atlas y Supabase reales
npx vitest run test/domain/transiciones.test.js   # una sola prueba
npm run test:api                           # Newman: 63 peticiones, 125 aserciones
npm run db:verify                          # la base cumple el enunciado
node scripts/db-explain.js                 # índices, validador y planes de ejecución
npm run demo:ttl                           # documento de 61 días desaparece, el de 59 permanece
```

Regla de oro en una defensa: después de cualquier cambio en vivo, correr la prueba de esa parte. Si falla, es lo esperado cuando se cambió una regla: se explica por qué falla y se actualiza la prueba.

---

## 4. Kevin Aarón Vargas Guzmán — Arquitectura, alta, contador, seguridad y despliegue (CU-01)

### Guion (unos 90 segundos)

«UTM Desk guarda cada incidencia como un solo documento en MongoDB Atlas. El servidor sigue una arquitectura limpia: el dominio contiene las reglas puras, la aplicación contiene los casos de uso y la infraestructura contiene Mongo y Supabase; la interfaz HTTP solo traduce peticiones. Cuando alguien crea una incidencia, Zod valida el cuerpo según la categoría; después se pide el consecutivo al contador, que es un `findOneAndUpdate` con `$inc` y `upsert`, por lo que dos peticiones simultáneas nunca reciben el mismo número. El documento se inserta con estado abierta y una primera entrada en la bitácora. Si Zod dejara pasar algo, el `$jsonSchema` de la colección lo rechaza. El reportante sale del token, nunca del cuerpo. Todo está desplegado en Vercel y se conecta a Atlas con variables de entorno.»

### Demostración en vivo
1. En Atlas, abrir `incidencias_campus` y mostrar un documento de cada categoría.
2. En la web, entrar como reportante, crear una incidencia de cada categoría y mostrar el código generado.
3. Enviar el formulario con un campo mal para mostrar el error junto al campo.
4. En Atlas, mostrar el documento nuevo y la colección `contadores`.

### Qué defender (preguntas probables)
- **¿Por qué un documento y no varias tablas?** El expediente se lee en una operación; `detalle_especifico` cambia por categoría y la bitácora, etiquetas y evidencias viajan embebidas.
- **¿Cómo evitan números repetidos?** `$inc` en un solo documento es atómico en MongoDB; con `upsert: true` se crea el contador del día si no existe. Hay una prueba con 20 llamadas paralelas.
- **¿Y si el insert falla después de consumir un número?** Queda un hueco en la numeración. Se acepta y está documentado.
- **¿Por qué dos validaciones?** Zod da errores claros al usuario; `$jsonSchema` protege la base aunque alguien la modifique sin pasar por la API.
- **¿Qué pasa si mandan `{"correo": {"$ne": null}}` al login?** Zod con campos estrictos lo rechaza con 400; nunca llega a Mongo.
- **¿Cómo protegen las contraseñas y la sesión?** bcrypt, JWT de 8 horas, hash falso cuando el correo no existe para no revelar usuarios, y un límite de 10 intentos fallidos por IP cada 15 minutos.
- **¿Por qué `0.0.0.0/0` en Atlas?** Las IP de Vercel cambian; el acceso se limita con un usuario de base de datos que solo tiene `readWrite` sobre `utmdesk`.

### Cambios que podrían pedirle y cómo hacerlos
| Petición | Dónde | Cómo comprobar |
|---|---|---|
| Agregar un edificio nuevo | `web/src/catalogo.js` (arreglo `EDIFICIOS`); el servidor no restringe el edificio | Abrir «Nueva incidencia» y ver la opción; crear una y filtrarla en la lista |
| Cambiar el formato del código (por ejemplo `UTM-AAAA-NNNN`) | `domain/codigo.js` (generación y `PATRON_CODIGO`) | `npx vitest run test/domain/codigo-enums.test.js`; los códigos viejos ya no cumplen el patrón, explicar el impacto |
| Cambiar la duración de la sesión | `infrastructure/seguridad/jwt.js` (8 h) | Iniciar sesión y decodificar el token; `npx vitest run test/interface/jwt.test.js` |
| Cambiar el límite de intentos de login | `interface/http/middlewares/limites.js` (`max = 10`) | Fallar la contraseña más veces que el límite y obtener 429 |
| Agregar un campo opcional universal (por ejemplo `telefono_contacto`) | `domain/esquemas.js` y `infrastructure/mongo/validador.js` (el validador es estricto, hay que agregarlo en ambos) y luego `npm run db:setup` | Crear una incidencia con el campo y comprobar que sin actualizar el validador Mongo la rechaza |

### Pruebas que podrían pedirle
`npm test`, `npx vitest run test/application/registrarIncidencia.test.js`, `npx vitest run test/infrastructure/mongo/contadorMongo.test.js`, y abrir `https://utm-desk-api.vercel.app/api/health`.

---

## 5. Luis Diego Arroyo León — Estado, bitácora, concurrencia y roles (CU-03)

### Guion (unos 90 segundos)

«El cambio de estado es la operación más delicada porque dos técnicos pueden actuar a la vez. Primero el servidor lee la incidencia y valida la transición con una máquina de estados: abierta, en proceso y en espera se pueden mover entre sí y llegan a resuelta; desde resuelta solo se pasa a cerrada, y solo el coordinador cierra. Después hace un solo `updateOne` cuyo filtro incluye el estado que leyó; en el mismo comando actualiza el estado, agrega una entrada a la bitácora con `$push` y suma las horas con `$inc`. Si otra persona cambió el estado entre la lectura y la escritura, el filtro no coincide, no se modifica nada y la API responde 409. La fecha de resolución solo se asienta al pasar a resuelta, porque de ella depende el TTL. Las horas por intervención van de 0 a 24.»

### Demostración en vivo
1. Entrar como técnico, abrir una incidencia abierta y pasarla a «en proceso» con horas y comentario; mostrar la bitácora.
2. Escribir 30 horas y mostrar el error.
3. Resolverla; mostrar que el técnico ya no puede cerrarla y que el coordinador sí.
4. En Atlas, mostrar `historial_seguimiento` y `horas_invertidas`.
5. Correr `npx vitest run test/infrastructure/mongo/actualizarEstado.integracion.test.js` para mostrar el 200 y el 409 simultáneos.

### Qué defender (preguntas probables)
- **¿Cómo garantizan que no se pierden horas ni bitácora con dos cambios simultáneos?** Con el estado leído dentro del filtro del `updateOne` y la comprobación de `matchedCount`; solo una escritura coincide.
- **¿Por qué no usar transacciones?** Un solo `updateOne` ya es atómico sobre un documento; una transacción añadiría costo sin necesidad.
- **¿Por qué la UI no puede probar el 409 fácilmente?** Porque el servidor vuelve a leer el estado en cada petición; el 409 aparece solo si ocurre la carrera real, por eso se prueba de forma determinista en integración.
- **¿Dónde se aplican los permisos?** En el servidor (`interface/http/middlewares/roles.js` y `domain/transiciones.js`); la UI solo oculta lo que no corresponde.
- **¿Qué estados llevan `fecha_resolucion`?** Solo resuelta y cerrada; el validador lo exige.
- **¿Qué cubre el banco de pruebas de Postman?** 63 peticiones agrupadas por caso de uso con 201, 200, 400, 401, 403, 404 y 409, y 125 aserciones.

### Cambios que podrían pedirle y cómo hacerlos
| Petición | Dónde | Cómo comprobar |
|---|---|---|
| Bajar el tope de horas de 24 a 12 | `domain/esquemas.js` (`.max(24, …)`); ajustar el texto de ayuda en `web/src/components/PanelEstado.jsx` | `npx vitest run test/domain/esquemas.test.js` (fallará la prueba del límite: se explica y se actualiza); en la UI, 13 horas da error |
| Permitir reabrir (resuelta → en proceso) | `domain/transiciones.js`, arreglo `DESTINOS.resuelta` | `npx vitest run test/domain/transiciones.test.js` falla donde se afirmaba que resuelta solo va a cerrada |
| Que el técnico también pueda cerrar | `domain/transiciones.js` (línea de `hacia === 'cerrada'`) | Probar cierre con técnico |
| Hacer que `en espera` exija comentario más largo | `domain/esquemas.js`, `cambiarEstadoSchema` (comentario mínimo de 3 caracteres) | Enviar comentario corto y ver el 400 |
| Mostrar el 409 | Pedir que se corra la prueba de concurrencia o la carpeta de Postman «Estado» | 200 y 409 en la salida |

### Pruebas que podrían pedirle
`npx vitest run test/application/actualizarEstado.test.js`, `test/interface/incidencias.estado.test.js`, `npm run test:api`, y ejecutar la colección completa en Postman con el entorno local.

---

## 6. Víctor Emmanuel Can Domínguez — Evidencias y etiquetas (CU-02 y CU-04)

### Guion (unos 90 segundos)

«Los archivos no se guardan en MongoDB. Al subir una evidencia, el servidor recibe el archivo en memoria, rechaza lo que pese más de 4 MB y lee los primeros bytes para saber qué es realmente: JPEG, PNG o PDF. No confía en la extensión ni en el tipo que manda el navegador, de modo que un ejecutable renombrado como imagen se rechaza. El archivo se sube a un depósito privado de Supabase con una ruta única por incidencia, y en Mongo se hace un solo `$push` con el nombre, tipo, peso, ruta y fecha. Como el depósito es privado, la URL de descarga es firmada y temporal, y se genera de nuevo cada vez que se consulta el expediente. Las etiquetas se normalizan a minúsculas y se agregan con `$addToSet`, por eso `Switch ` y `switch` son la misma; `$pull` las quita.»

### Demostración en vivo
1. Subir un PNG y un PDF a una incidencia y abrir ambos.
2. Intentar subir un texto renombrado como `.png`, un archivo de más de 4 MB y uno vacío: los tres se rechazan.
3. En Atlas, mostrar `evidencias_adjuntas`; en Supabase, mostrar el objeto en el depósito privado.
4. Agregar `Switch ` y `switch` y mostrar que solo queda una; quitarla.

### Qué defender (preguntas probables)
- **¿Por qué 4 MB?** Vercel limita el cuerpo de una petición a unos 4.5 MB.
- **¿Cómo detectan el tipo real?** Con la firma de bytes del archivo (`infrastructure/archivos/detectarTipo.js`).
- **¿Por qué el depósito es privado?** Para que nadie descargue evidencias sin una URL firmada; la URL caduca y se regenera.
- **¿Qué pasa si falla Mongo después de subir el archivo?** Se borra el objeto del depósito para no dejar archivos huérfanos.
- **¿Qué pasa con los archivos si se borra la incidencia?** El caso de uso de eliminar también borra sus objetos del depósito.
- **¿Qué evita que `Switch` y `switch` se dupliquen?** La normalización en `gestionarEtiquetas.js` y `$addToSet`.

### Cambios que podrían pedirle y cómo hacerlos
| Petición | Dónde | Cómo comprobar |
|---|---|---|
| Subir el límite a 3 MB o bajarlo a 2 MB | `domain/evidencia.js` (`MAX_BYTES_EVIDENCIA`) y `web/src/components/SubirEvidencia.jsx` (`MAX_BYTES`) | `npx vitest run test/domain/evidencia.test.js`; subir un archivo de 3 MB |
| Permitir otro tipo de imagen (por ejemplo WebP) | `domain/evidencia.js` (`TIPOS_EVIDENCIA`), `infrastructure/archivos/detectarTipo.js` y `accept` en `SubirEvidencia.jsx`; el depósito de Supabase también restringe tipos | Subir un WebP real y uno falso |
| Cambiar el largo de las etiquetas (2–40) | `domain/esquemas.js` (`etiquetaSchema`) | `npx vitest run test/application/gestionarEtiquetas.test.js` |
| Limitar a 5 evidencias por incidencia | `application/cargarEvidencia.js`: contar `evidencias_adjuntas` antes de subir y responder 400 | Subir seis archivos y ver el rechazo del sexto |
| Hacer que las etiquetas sean obligatorias para resolver | `application/actualizarEstado.js` | Resolver sin etiquetas y ver el 400 |

### Pruebas que podrían pedirle
`npx vitest run test/application/cargarEvidencia.test.js`, `test/interface/evidencias.test.js`, `test/infrastructure/almacen/evidencias.integracion.test.js` (sube a Supabase real) y las carpetas «Evidencias» y «Etiquetas» de Postman.

---

## 7. Emir Emanuel Montalvo Canché — Búsqueda, analítica, índices, TTL y datos (CU-05, CU-06 y CU-07)

### Guion (unos 90 segundos)

«La búsqueda usa un índice de texto en español sobre el título, con peso 10, y la descripción, con peso 5. Al ser español, aplica raíces: buscar “filtración” encuentra “filtraciones”. La consulta usa `$text`, proyecta el puntaje con `$meta: "textScore"` y ordena por relevancia; `explain()` muestra la etapa `TEXT_MATCH` y el índice `idx_texto_es`. La analítica tiene dos pipelines: el primero filtra las incidencias resueltas o cerradas, calcula con `$dateDiff` las horas entre creación y resolución, agrupa por edificio y ordena por promedio; el segundo desenrolla las etiquetas con `$unwind`, las cuenta y toma las diez más frecuentes. La depuración usa un índice TTL sobre `fecha_resolucion` de 60 días: cuando se cumple el plazo, MongoDB borra el documento solo. El script `demo:ttl` lo demuestra en segundos con un documento de 61 días y otro de 59.»

### Demostración en vivo
1. Buscar «filtración» y mostrar que aparece «filtraciones» con su relevancia.
2. Mostrar `node scripts/db-explain.js` (índices y planes con `IXSCAN` y `TEXT_MATCH`).
3. Entrar como coordinador o directivo y mostrar la analítica; comparar un promedio con el pipeline en Atlas.
4. Correr `npm run demo:ttl`.
5. Mostrar `npm run db:verify` (24 incidencias y las condiciones del enunciado).

### Qué defender (preguntas probables)
- **¿Por qué el título pesa más?** Un acierto en el título es más indicativo que uno en la descripción.
- **¿Las etiquetas entran en la búsqueda?** No: el índice cubre `titulo` y `descripcion`; las etiquetas se filtran y se cuentan en la analítica.
- **¿Qué hace `$dateDiff`?** Calcula la diferencia entre dos fechas en la unidad indicada; aquí, horas entre `fecha_creacion` y `fecha_resolucion`.
- **¿Cómo funciona el TTL?** Un proceso de MongoDB revisa cada minuto aproximadamente y borra los documentos cuya `fecha_resolucion` + 60 días ya pasó; por eso la demo tarda unos segundos y no es instantánea.
- **¿Qué pasa con un enlace a una incidencia depurada?** La API responde 404 y la UI muestra «no existe o ya fue depurada».
- **¿Cómo se sabe que la base cumple el enunciado?** `db:verify` revisa conteos por categoría, estado, prioridad y edificio, resueltas, evidencias y etiquetas.
- **¿Qué pasa si cambian el valor del TTL?** Un índice TTL no se recrea con otras opciones usando `createIndex`: hay que usar `collMod` o borrar y recrear el índice. El usuario de la aplicación no tiene `collMod`, por eso se demuestra en una colección de prueba.

### Cambios que podrían pedirle y cómo hacerlos
| Petición | Dónde | Cómo comprobar |
|---|---|---|
| Top 5 de etiquetas en lugar de 10 | `infrastructure/mongo/analiticaRepo.js` (`$limit: 10`) y el texto de la pantalla en `web/src/pages/Analitica.jsx` | `npx vitest run test/infrastructure/mongo/analitica.integracion.test.js` (fallará la longitud esperada) y la pantalla |
| Ordenar la analítica por edificio con más horas de trabajo | `analiticaRepo.js`, etapa `$sort` del Pipeline 1 | Comparar el orden en la pantalla |
| Agregar un tercer pipeline: incidencias por categoría | Método nuevo en `analiticaRepo.js` con `$group: { _id: "$categoria", total: { $sum: 1 } }`, caso de uso en `application/consultarAnalitica.js` y ruta en `interface/http/rutas/analitica.js` | `GET /api/analitica/categorias` con token de coordinador |
| Cambiar los pesos de la búsqueda | `infrastructure/mongo/indices.js` (`weights`); requiere borrar y recrear `idx_texto_es` | Comparar el `score` antes y después en una colección de prueba |
| Mostrar el plan de una consulta distinta | `node scripts/db-explain.js` o `db.incidencias_campus.find({...}).explain("executionStats")` en Atlas | Se ve `IXSCAN` o `COLLSCAN` |

### Pruebas que podrían pedirle
`npx vitest run test/application/buscarIncidencias.test.js`, `test/infrastructure/mongo/incidenciasRepo.busqueda.integracion.test.js`, `test/scripts/ttl.test.js`, `npm run demo:ttl` y `npm run db:verify`.

---

## 8. Lo que todos deben saber (preguntas comunes)

- **¿Por qué MongoDB y no SQL?** Tres categorías con datos específicos distintos; un documento por incidencia, con el expediente en una sola lectura y sin joins.
- **¿Dónde están los binarios?** En un depósito privado de Supabase; Mongo guarda solo metadatos y la ruta.
- **¿Por qué no Redis?** El docente aceptó el contador en MongoDB.
- **¿Por qué cuatro prioridades si el enunciado menciona tres?** Decisión del equipo: se agregó «crítica» para servicio caído o riesgo; está en el enum y en el validador.
- **¿Qué roles hay?** Reportante, técnico, coordinador y directivo; los permisos se aplican en el servidor.
- **¿Qué riesgos aceptaron?** El límite de peticiones es por instancia en Vercel y la sesión se guarda en `localStorage`; detalle en `docs/revision-R05-seguridad.md`.
- **¿Qué no se pudo probar?** `mongosh` real sobre el script maestro (se ejecutó con el driver en una base vacía de Atlas).

## 9. Cómo practicar la defensa

1. Cada integrante explica su guion en voz alta, sin leer, en menos de dos minutos.
2. Otro integrante hace el papel del docente y pide dos cambios de la tabla de su parte; se hacen, se prueban y se revierten con `git checkout -- <archivo>`.
3. Cada integrante abre en el código, sin buscar, tres archivos de la tabla «muéstrame dónde…» de otra persona.
4. Antes de la entrega: `npm test`, `npm run test:api`, `npm run db:verify` y revisar que la base tenga las 24 incidencias de ejemplo.
5. Hacer los cambios de práctica en una rama local (`git switch -c practica-defensa`) para no tocar `main`.
