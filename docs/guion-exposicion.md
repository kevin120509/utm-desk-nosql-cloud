# Guion de la exposición — UTM Desk NoSQL Cloud

Duración objetivo: **9 minutos** de exposición y demo, más preguntas del docente (Lizandro Israel Reyes Carrillo).
Quién habla: Kevin abre y cierra; Luis Diego, Víctor y Emir presentan su parte entre medio. Los textos están escritos para decirse en voz alta; cada quien puede cambiar las palabras, pero no los datos.

## Antes de empezar (10 minutos antes)

1. Correr `npm run db:verify` en `server/` y confirmar 24 incidencias.
2. Abrir cuatro pestañas: la web (https://utm-desk-web.vercel.app), Atlas (Data Explorer en `utmdesk`), Postman con la colección y el entorno, y una terminal en `server/`.
3. Tener a la mano un PNG pequeño y un PDF pequeño en el escritorio, y un `.txt` renombrado como `.png`.
4. Iniciar sesión en la web con cada cuenta **antes** de la exposición solo para comprobar que funciona; no fallar la contraseña (el login se bloquea tras 10 intentos fallidos en 15 minutos).
5. Quien maneja el teclado: Kevin. Los demás explican mientras él hace los pasos.

## Resumen de tiempos

| Min | Quién | Qué |
|---|---|---|
| 0:00–1:15 | Kevin | Problema, solución y arquitectura |
| 1:15–2:30 | Kevin | Atlas y alta de incidencia (demo) |
| 2:30–3:45 | Víctor | Evidencias y etiquetas (demo) |
| 3:45–5:15 | Luis Diego | Estado, bitácora y concurrencia (demo) |
| 5:15–7:15 | Emir | Búsqueda, analítica y TTL (demo) |
| 7:15–8:15 | Luis Diego | Postman y pruebas |
| 8:15–9:00 | Kevin | Seguridad, despliegue y cierre |

---

## 1. Kevin — Apertura (0:00–1:15)

**Pantalla:** la web en la pantalla de inicio de sesión.

> «Buenos días, profesor. Somos el equipo de Arroyo León Luis Diego, Can Domínguez Víctor Emmanuel, Montalvo Canché Emir Emanuel y Vargas Guzmán Kevin Aarón. Presentamos UTM Desk, un sistema para gestionar las incidencias del campus: fallas de cómputo y redes, problemas de infraestructura y problemas de sistemas académicos.
>
> El problema es que estas incidencias se reportan por correo u hojas de cálculo, no queda historial de qué se hizo y no se puede medir cuánto tarda cada edificio en resolver ni qué fallas se repiten. Como cada categoría necesita datos distintos, elegimos MongoDB Atlas: cada incidencia es un solo documento con un campo `detalle_especifico` que cambia según la categoría, y con su bitácora, etiquetas y evidencias dentro.
>
> La arquitectura tiene cuatro capas: dominio, aplicación, infraestructura e interfaz HTTP. La base está en Atlas, las evidencias en un bucket privado de Supabase, y la API y la web están desplegadas en Vercel, así que esta demo no depende de mi laptop.
>
> Les voy a mostrar el ciclo completo de una incidencia, y cada uno de nosotros explicará la parte que implementó.»

## 2. Kevin — Atlas y alta de incidencia (1:15–2:30)

**Pantalla:** Atlas → `incidencias_campus` → Documents; luego la web.

> «Esta es la colección `incidencias_campus` en Atlas, con 24 documentos de demostración. Cada uno tiene un `detalle_especifico` distinto según su categoría: aquí uno de cómputo, con modelo de equipo y dirección IP; aquí uno de infraestructura, con tipo de daño y riesgo; y aquí uno académico, con plataforma y número de estudiantes afectados. En la pestaña de Indexes están los índices: uno compuesto por categoría, estado y edificio, uno de texto en español, uno TTL de 60 días, uno único por código y uno por reportante. En Validation está el `$jsonSchema` en modo estricto.»

**Acción:** entrar como reportante (Ana Pech) → Nueva incidencia. Elegir una categoría y dejar un campo mal para mostrar el error; corregir y crear.

> «Entro como reportante. El formulario cambia según la categoría. Si dejo un campo mal, el error aparece junto al campo: eso lo valida Zod en el servidor. Corrijo y creo la incidencia. Recibe el código `INC-2026` más un consecutivo que sale de un contador en MongoDB: un `findOneAndUpdate` con `$inc` y `upsert`, que es atómico, por eso dos altas simultáneas nunca reciben el mismo número. El reportante sale del token de sesión, no del formulario.»

**Acción:** volver a Atlas, refrescar, mostrar el documento nuevo y la colección `contadores`.

> «Aquí está el documento nuevo en Atlas, con estado abierta y su primera entrada en la bitácora.»

## 3. Víctor — Evidencias y etiquetas (2:30–3:45)

**Pantalla:** la incidencia recién creada.

> «Yo me encargué de las evidencias y las etiquetas. Los archivos no se guardan en MongoDB: se guardan en un bucket privado de Supabase y en Mongo solo se guardan los datos del archivo.»

**Acción:** subir el PNG y luego el PDF. Abrir ambos.

> «Subo una imagen y un PDF. Los dos aparecen en el expediente, y el enlace de descarga es una URL firmada que caduca; cada vez que se abre el expediente se genera de nuevo.»

**Acción:** subir el `.txt` renombrado como `.png`.

> «Ahora subo un archivo de texto renombrado como `.png`. Se rechaza, porque el servidor no confía en la extensión ni en lo que diga el navegador: lee los primeros bytes del archivo para saber qué es en realidad. Lo mismo pasa con archivos de más de 4 MB, que es el límite porque Vercel acepta cuerpos de unos 4.5 MB, y con archivos vacíos.»

**Acción:** abrir Atlas y mostrar `evidencias_adjuntas` en el documento.

> «En Atlas se ve el `$push` en `evidencias_adjuntas`: nombre, tipo, peso, ruta en el bucket y fecha. Si Mongo fallara después de subir el archivo, el servidor borra el objeto para no dejar archivos huérfanos.»

**Acción:** agregar la etiqueta `Switch ` y luego `switch`.

> «Para las etiquetas escribo `Switch ` con mayúscula y espacio, y luego `switch`. Solo queda una, porque se normalizan a minúsculas y se agregan con `$addToSet`. Para quitarla se usa `$pull`.»

## 4. Luis Diego — Estado, bitácora y concurrencia (3:45–5:15)

**Pantalla:** cerrar sesión; entrar como técnico (Luis Cauich) y abrir la misma incidencia.

> «Yo me encargué del cambio de estado, que es la operación más delicada. Entro como técnico y paso la incidencia a “en proceso” con horas y un comentario.»

**Acción:** escribir 30 horas y guardar (error); corregir a 2 horas con comentario y guardar.

> «Si escribo 30 horas, el sistema lo rechaza: el máximo por intervención es 24. Con 2 horas, el cambio se guarda y aparece en la bitácora sin recargar la página.»

> «Lo importante pasa en el servidor. Primero se valida la transición con una máquina de estados: abierta, en proceso y en espera se mueven entre sí y llegan a resuelta; desde resuelta solo se puede ir a cerrada, y eso solo lo hace el coordinador. Después se ejecuta un solo `updateOne` cuyo filtro incluye el estado que el servidor leyó. En el mismo comando se actualiza el estado, se agrega la entrada a la bitácora con `$push` y se suman las horas con `$inc`. Si otra persona cambió el estado en ese instante, el filtro ya no coincide, no se modifica nada y la API responde 409.»

**Acción:** en la terminal, correr `npx vitest run test/infrastructure/mongo/actualizarEstado.integracion.test.js`.

> «Esta prueba lanza dos cambios a la vez contra Atlas real: uno recibe 200 y el otro 409, y las horas y la bitácora quedan correctas. En la interfaz es difícil provocarlo a mano, por eso lo comprobamos así.»

**Acción:** resolver la incidencia como técnico y mostrar que no puede cerrarla.

> «Al resolverla se asienta `fecha_resolucion`, que es el campo del que depende el borrado automático. El técnico ya no puede cerrarla; eso queda para el coordinador.»

## 5. Emir — Búsqueda, analítica y TTL (5:15–7:15)

**Pantalla:** entrar como coordinador (Roberto Mena) → lista de incidencias.

> «Yo me encargué de la búsqueda, la analítica y la depuración automática. Empiezo con la búsqueda.»

**Acción:** buscar `filtración`.

> «Busco “filtración” y aparecen incidencias que dicen “filtraciones”, ordenadas por relevancia. Esto usa un índice de texto en español sobre el título, con peso 10, y la descripción, con peso 5, y la consulta `$text` con el puntaje de `textScore`. Las etiquetas no entran en este índice.»

**Acción:** en la terminal, `node scripts/db-explain.js`.

> «Con `explain` comprobamos que las consultas usan índices: la búsqueda usa la etapa de texto, los listados filtrados usan `IXSCAN` sobre el índice compuesto y el código usa el índice único.»

**Acción:** abrir Analítica.

> «La analítica tiene dos pipelines. El primero toma solo las incidencias resueltas o cerradas, calcula con `$dateDiff` las horas entre creación y resolución, agrupa por edificio y ordena por promedio. Aquí vemos que el Edificio A es el más lento, con casi 50 horas en promedio. El segundo desenrolla las etiquetas con `$unwind`, las cuenta y toma las diez más frecuentes: así se detectan fallas que se repiten.»

**Acción:** en la terminal, `npm run demo:ttl`.

> «Por último, la depuración automática. Hay un índice TTL de 60 días sobre `fecha_resolucion`. Este script siembra dos documentos: uno resuelto hace 61 días y otro hace 59. Mongo revisa los índices TTL cada minuto aproximadamente; el de 61 días desaparece y el de 59 permanece. Si alguien abre el enlace de una incidencia ya depurada, la API responde 404 y la web lo explica.»

## 6. Luis Diego — Postman y pruebas (7:15–8:15)

**Pantalla:** Postman con la colección.

> «Para comprobar todo esto armamos una colección de Postman con 63 peticiones, una carpeta por caso de uso. Cubre los códigos 201, 200, 400, 401, 403, 404 y la concurrencia del cambio de estado.»

**Acción:** ejecutar la colección con el entorno de producción, o correr `npm run test:api` en la terminal.

> «La ejecuto contra la API desplegada en Vercel y las 125 aserciones pasan. Además tenemos 351 pruebas automáticas con Vitest, que se ejecutan contra Atlas y Supabase reales, no contra simulaciones.»

## 7. Kevin — Seguridad, despliegue y cierre (8:15–9:00)

**Pantalla:** `docs/revision-R05-seguridad.md` o la web.

> «Sobre seguridad: las contraseñas usan bcrypt, la sesión es un JWT de 8 horas, los permisos se validan en el servidor y no solo en la interfaz, el login tiene límite de intentos, la validación estricta rechaza operadores de inyección NoSQL, el bucket es privado y los secretos viven solo en variables de entorno. Revisamos 20 controles y documentamos los riesgos que aceptamos: el límite de peticiones es por instancia en Vercel y la sesión se guarda en el navegador.
>
> En resumen, cumplimos los siete casos de uso del enunciado: alta, evidencias, estado y bitácora, etiquetas, búsqueda, analítica y depuración automática, con dos pipelines de agregación, tres índices obligatorios más dos de apoyo, validación en dos capas, pruebas automáticas y todo desplegado en la nube. Quedamos atentos a sus preguntas. Gracias.»

---

## Si el docente pide cambios en vivo

Cada integrante tiene su lista en `docs/guia-defensa.md` (sección de su nombre). Reglas para todos:

1. **Repetir lo que piden** antes de hacerlo, para ganar un segundo y confirmar que entendieron.
2. **Decir dónde está** el archivo antes de abrirlo («esto vive en `domain/transiciones.js`»).
3. **Cambiar lo mínimo**, correr la prueba de esa parte y explicar el resultado, aunque falle: una prueba que falla porque se cambió una regla es lo esperado.
4. **Revertir** con `git checkout -- <archivo>` al terminar.
5. Si no saben algo: «No lo recuerdo de memoria, pero está en este archivo y lo leo» y abrirlo. Es mejor que adivinar.

Ejemplos de peticiones probables y quién responde:

| Petición | Responde |
|---|---|
| «Cambia el máximo de horas de 24 a 12» | Luis Diego |
| «Permite reabrir una incidencia resuelta» | Luis Diego |
| «Agrega un edificio nuevo» | Kevin |
| «Cambia el formato del código» | Kevin |
| «Permite subir archivos de 2 MB como máximo» | Víctor |
| «Limita a 5 evidencias por incidencia» | Víctor |
| «Muestra solo el top 5 de etiquetas» | Emir |
| «Agrega un pipeline por categoría» | Emir |
| «Muéstrame el `explain` de esta consulta» | Emir |
| «Ejecuta las pruebas» | Luis Diego (`npm test`, `npm run test:api`) |

## Preguntas que el docente puede hacer y respuestas cortas

- **¿Por qué MongoDB y no SQL?** Tres categorías con datos distintos y un expediente que se lee completo: un documento por incidencia, sin joins. (Kevin)
- **¿Qué pasa si dos técnicos cambian el estado a la vez?** El `updateOne` lleva el estado leído en el filtro; solo una escritura coincide y la otra recibe 409. (Luis Diego)
- **¿Cómo saben que un archivo es realmente una imagen?** Leemos la firma de bytes, no la extensión. (Víctor)
- **¿Cómo funciona el TTL?** Un índice con `expireAfterSeconds` sobre `fecha_resolucion`; Mongo lo revisa cada minuto aproximadamente. (Emir)
- **¿Por qué cuatro prioridades si el enunciado menciona tres?** El equipo agregó «crítica» para riesgo o servicio caído; está en el enum y en el validador. (Kevin)
- **¿Por qué no usaron Redis para el contador?** Usted aceptó el contador en MongoDB; es atómico con `$inc` y `upsert`. (Kevin)
- **¿Qué pasa si falla Mongo después de consumir un número del contador?** Queda un hueco en la numeración; se documentó como aceptable. (Kevin)
- **¿Por qué hay dos validaciones?** Zod da errores claros al usuario; `$jsonSchema` protege la colección aunque alguien escriba sin pasar por la API. (Kevin)
- **¿Qué no pudieron resolver o qué mejorarían?** El límite de peticiones por instancia en Vercel (usaríamos un almacén compartido), un tope de evidencias por incidencia y mover el token de `localStorage` a una cookie `httpOnly`. (Kevin)

## Plan B

- **La web o Vercel falla:** correr local con `npm --prefix server run start` y `npm --prefix web run dev` contra el mismo Atlas.
- **Atlas lento:** mostrar `entregables/incidencias_campus.json` y las capturas de `docs/capturas/`.
- **El TTL tarda:** dejar el script corriendo y volver al final, o mostrar la captura y el resultado de la prueba `test/scripts/ttl.test.js`.
- **Login bloqueado por demasiados intentos:** esperar 15 minutos o usar otra red; por eso se ensaya sin fallar la contraseña.
- **Falla una subida:** usar el PNG y el PDF pequeños preparados.
- **Si se acaba el tiempo:** omitir las etiquetas y resumir la analítica en una frase.

## Ensayo

1. Primera vuelta: cada quien lee su parte en voz alta con cronómetro.
2. Segunda vuelta: con la demo real y sin leer; si pasa de 9 minutos, recortar el paso de etiquetas.
3. Tercera vuelta: otro integrante hace el papel del docente y pide dos cambios en vivo de la tabla anterior.
