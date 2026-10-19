# Cómo funciona UTM Desk, pieza por pieza

Este documento explica qué hace cada herramienta del proyecto y cómo encajan, para entenderlo de principio a fin.

## 1. La idea en una frase

UTM Desk es un sistema para reportar y dar seguimiento a las fallas del campus (red, instalaciones, plataformas académicas). Una persona reporta, un técnico atiende, un coordinador supervisa y un directivo consulta las estadísticas. Todo queda guardado en una base de datos en la nube.

## 2. El recorrido de una incidencia (el hilo que une todo)

1. **Ana (reportante) abre la web** y llena el formulario.
2. **La web (React)** manda los datos a la **API (Express)** por internet.
3. **La API** revisa que el usuario esté logueado y que los datos sean válidos.
4. **La API le pide a MongoDB Atlas** un número consecutivo y guarda la incidencia.
5. Ana sube una foto: **la API la manda a Supabase Storage** y en Mongo solo anota dónde quedó.
6. **Luis (técnico)** cambia el estado y registra horas: la API lo escribe en Mongo.
7. **Roberto (coordinador)** consulta la analítica: Mongo calcula promedios y conteos.
8. Cuando una incidencia lleva 60 días resuelta, **Mongo la borra solo**.

Eso es todo el sistema. Lo demás son las piezas que lo hacen posible.

## 3. Las piezas

### MongoDB (la base de datos)
Guarda información en **documentos**, que se parecen a un objeto JSON. En lugar de varias tablas con relaciones, una incidencia es **un solo documento** que contiene todo: título, categoría, ubicación, bitácora, etiquetas y los datos de sus archivos. Por eso leer un expediente completo es una sola consulta.

Dos ideas clave del proyecto:
- **Documento polimórfico:** cada categoría tiene un campo `detalle_especifico` distinto (una falla de red guarda la IP del equipo; una de infraestructura guarda el tipo de daño). En SQL esto obligaría a varias tablas; aquí es un solo campo flexible.
- **Datos embebidos:** la bitácora, las etiquetas y las evidencias viven dentro del documento, no en tablas aparte.

### MongoDB Atlas (donde vive Mongo)
Atlas es el servicio **en la nube** que aloja MongoDB: no instalamos nada en nuestra computadora. Usamos el plan gratuito (M0, 512 MB). Desde Atlas vemos los datos (Data Explorer), los índices y el validador. Atlas controla quién puede entrar: un usuario de base de datos (`readWrite` solo sobre `utmdesk`) y una lista de IP permitidas.

La conexión se hace con una cadena `MONGODB_URI` que es secreta y vive solo en variables de entorno, nunca en el código.

### Colecciones
Una colección es como una "tabla" de documentos. Tenemos tres:
- `incidencias_campus`: las incidencias (la principal).
- `usuarios`: las cuentas, con contraseña guardada como hash.
- `contadores`: los números consecutivos del día.

### Validador (`$jsonSchema`)
Es una regla que Mongo aplica **a cada documento que se guarda**: qué campos son obligatorios, de qué tipo y qué valores se permiten. Si algo no cumple, Mongo lo rechaza con error. Está en modo **strict** con acción **error**. Es la segunda línea de defensa: la primera es Zod en la API.

### Índices
Un índice es como el índice de un libro: permite encontrar documentos sin leer toda la colección. Usamos cinco:
- **Compuesto** (categoría, estado, edificio): para los listados con filtros.
- **TTL** (sobre `fecha_resolucion`, 60 días): para borrar solo.
- **De texto en español**: para buscar palabras, con peso 10 en el título y 5 en la descripción.
- **Único por código**: evita códigos repetidos y acelera abrir un expediente.
- **Por reportante**: para que cada persona vea sus incidencias rápido.

`explain()` es la herramienta que demuestra que una consulta usó el índice (`IXSCAN`) y no leyó todo (`COLLSCAN`).

### Operaciones de Mongo que usamos
- `$inc` + `upsert`: suma 1 a un contador de forma **atómica** (nadie más puede colarse a la mitad). Así no se repiten números.
- `$push`: agrega un elemento a un arreglo (bitácora, evidencias).
- `$addToSet`: agrega solo si no existe (etiquetas sin duplicados).
- `$pull`: quita un elemento de un arreglo.
- `updateOne` con filtro: cambia el estado solo si sigue siendo el que leímos; si otra persona lo cambió, no escribe nada y respondemos 409.
- `$text`: búsqueda por palabras, con puntaje de relevancia.
- **Pipelines de agregación** (`$match`, `$group`, `$unwind`, `$sort`, `$limit`, `$dateDiff`): procesan datos dentro de Mongo para sacar estadísticas.

### TTL (borrado automático)
Un índice TTL le dice a Mongo: «borra los documentos cuando pasen N segundos desde la fecha de este campo». Aquí son 5,184,000 s = 60 días desde `fecha_resolucion`. Mongo revisa cada minuto aproximadamente. Solo las incidencias resueltas o cerradas tienen ese campo, por eso solo ellas se borran.

### Supabase Storage (los archivos)
Guardar fotos y PDF dentro de la base sería caro y lento, así que van a un **bucket** (carpeta en la nube) de Supabase. El bucket es **privado**: nadie descarga un archivo sin una **URL firmada**, un enlace temporal que se genera para cada consulta y caduca. En Mongo solo se guarda el nombre, tipo, peso y ruta del archivo.

### La API (Express, Node.js)
Es el "cerebro" entre la web y las bases de datos. Recibe peticiones HTTP y responde en JSON. Rutas principales:
- `POST /api/auth/login`: iniciar sesión.
- `POST /api/incidencias` y `GET /api/incidencias`: crear y listar.
- `GET /api/incidencias/:codigo`: abrir un expediente.
- `PATCH /api/incidencias/:codigo/estado`: cambiar estado.
- `POST /api/incidencias/:codigo/evidencias`: subir archivo.
- `POST` y `DELETE` en `/tags`: etiquetas.
- `GET /api/incidencias/buscar?q=`: búsqueda.
- `GET /api/analitica/edificios` y `/tags`: estadísticas.

Códigos de respuesta: 200 (bien), 201 (creado), 400 (datos inválidos), 401 (sin sesión), 403 (sin permiso), 404 (no existe), 409 (conflicto: alguien cambió el estado antes).

### Arquitectura limpia (cómo está ordenado el código del servidor)
Cuatro carpetas en `server/src/`:
- `domain`: reglas puras (estados, transiciones, validaciones). No sabe de Mongo ni de HTTP.
- `application`: los casos de uso (registrar, cambiar estado, buscar…). Cada uno es una acción del sistema.
- `infrastructure`: lo que habla con el exterior (Mongo, Supabase, bcrypt, JWT).
- `interface`: las rutas y filtros de Express.
`aplicacion.js` conecta todo. Ventaja: se puede probar cada regla sin base de datos y cambiar una pieza sin romper las demás.

### Zod (validación en la API)
Librería que revisa que el cuerpo de cada petición tenga la forma correcta (campos, tipos, rangos) y rechaza campos extra. Ejemplos: horas entre 0 y 24, etiqueta de 2 a 40 caracteres, `detalle_especifico` que coincida con la categoría. También bloquea intentos de inyección como `{"$ne": null}`.

### Seguridad
- **bcrypt:** guarda las contraseñas como hash; nadie puede leerlas.
- **JWT:** el "pase" que recibe el usuario al iniciar sesión, válido 8 horas; la web lo manda en cada petición.
- **Roles:** reportante, técnico, coordinador y directivo; la API decide qué puede hacer cada uno (la interfaz solo oculta botones).
- **Límite de intentos:** 10 intentos fallidos de login por IP cada 15 minutos.
- **helmet y CORS:** cabeceras seguras y solo la web propia puede llamar a la API.
- **Secretos:** claves en variables de entorno, no en GitHub.

### La web (React, Vite, Tailwind)
La interfaz que ve el usuario. React arma las pantallas, Vite la compila y la sirve, Tailwind le da el estilo. Guarda el token de sesión en el navegador y lo manda a la API. El formulario de nueva incidencia cambia sus campos según la categoría. Recharts dibuja las gráficas de analítica. Es responsiva: funciona en teléfono.

### Vercel (el hosting)
Sirve la web y ejecuta la API como **función sin servidor**: no hay una computadora encendida, Vercel arranca el código cuando llega una petición. Por eso la demo no depende de nuestras laptops. Son dos proyectos: `utm-desk-api` y `utm-desk-web`. Las claves se configuran como variables de entorno marcadas como sensibles.

### Postman y Newman (pruebas de la API)
Postman es una aplicación para enviar peticiones a la API y ver la respuesta. Nuestra **colección** tiene 63 peticiones agrupadas por caso de uso, cada una con pruebas automáticas (125 en total). Newman es Postman en terminal: corre toda la colección con `npm run test:api`.

### Vitest y Supertest (pruebas automáticas)
Vitest ejecuta 351 pruebas del código, muchas contra Atlas y Supabase reales usando colecciones temporales. Supertest simula peticiones HTTP a la API dentro de las pruebas.

### Scripts de base de datos (`server/scripts/`)
- `db:setup`: crea la colección con su validador e índices.
- `db:seed`: borra los datos de ejemplo y carga 24 incidencias y las cuentas de demostración (sube archivos de muestra a Supabase).
- `db:verify`: comprueba que los datos cumplen lo que pide el enunciado.
- `db:export`: genera `incidencias_campus.json` y el `script-maestro.js` de `mongosh`.
- `demo:ttl`: demuestra el borrado automático con un documento de 61 días y otro de 59.
- `db-explain.js`: muestra índices y planes de ejecución.
- `test:api`: corre Newman.

### mongosh y el script maestro
`mongosh` es la consola de Mongo. El `script-maestro.js` recrea todo desde cero en una base vacía: colección, validador, índices y los 24 documentos. Es el entregable que reproduce la base.

### Git y GitHub
Git guarda el historial de cambios; GitHub aloja el repositorio (privado). Cada tarea terminada es un commit.

## 4. Los cuatro roles

| Rol | Qué puede hacer |
|---|---|
| Reportante (docente, estudiante, administrativo) | Crear incidencias, ver solo las suyas y subir evidencia a las suyas |
| Técnico | Ver todas, cambiar estado, horas y bitácora, etiquetas y evidencias |
| Coordinador | Lo del técnico, más cerrar, editar, borrar y ver analítica |
| Directivo | Solo lectura, búsqueda y analítica |

## 5. Estados de una incidencia

`abierta` ↔ `en proceso` ↔ `en espera` → `resuelta` → `cerrada`.
Abierta, en proceso y en espera se pueden mover entre sí y llegan a resuelta. Desde resuelta solo se pasa a cerrada, y solo el coordinador cierra. Nada se reabre. Al resolver se guarda `fecha_resolucion`, que activa el reloj del TTL de 60 días.

## 6. Decisiones que debes poder defender

- **MongoDB en lugar de SQL:** datos distintos por categoría y expediente completo en una lectura.
- **Contador en Mongo, no en Redis:** el docente lo aceptó; `$inc` con `upsert` es atómico.
- **Archivos en Supabase, no en Mongo:** la base es para datos; los binarios son pesados.
- **Dos capas de validación:** Zod da errores claros; `$jsonSchema` protege la base aunque se salten la API.
- **Cuatro prioridades:** se agregó «crítica» para riesgo o servicio caído.
- **Estado con filtro en `updateOne`:** evita que dos técnicos se pisen sin necesidad de transacciones.
- **Vercel:** la demo corre en la nube y no depende de una laptop.

## 7. Glosario rápido

- **API:** programa que responde peticiones de otros programas.
- **JSON:** formato de texto para datos, con llaves y pares clave-valor.
- **HTTP:** el protocolo con el que se piden y devuelven datos en la web.
- **Atómico:** que ocurre completo o no ocurre, sin que nadie se meta a la mitad.
- **Hash:** huella irreversible de una contraseña.
- **Token (JWT):** comprobante firmado de que ya iniciaste sesión.
- **Serverless:** código que corre solo cuando se necesita, sin servidor propio encendido.
- **Bucket:** carpeta de archivos en la nube.
- **URL firmada:** enlace temporal para descargar un archivo privado.
- **Índice:** estructura que acelera las búsquedas.
- **Pipeline:** cadena de etapas que transforma datos dentro de Mongo.
- **TTL:** tiempo de vida; pasado ese tiempo el documento se borra solo.
