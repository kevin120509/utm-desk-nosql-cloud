# Constitución — UTM Desk NoSQL Cloud

Principios que no cambian durante el proyecto. Si algo los contradice, se discute con Kevin antes de implementar.

## 1. Cumplir el enunciado primero
1. MongoDB Atlas M0 es el repositorio documental principal. El driver es el nativo (`mongodb`).
2. Se entrega todo lo que el enunciado marca como obligatorio: colección `incidencias_campus` con 20–30 documentos, `detalle_especifico` polimórfico, `tags[]`, `historial_seguimiento[]`, `evidencias_adjuntas[]`, `reportante{}`, `ubicacion{}`, los 3 índices, los 5 operadores atómicos (`$set`, `$inc`, `$push`, `$addToSet`, `$pull`) y los 2 pipelines.
3. Postman prueba POST 201, GET 200, PATCH/PUT 200 y un 400 de validación.
4. Cualquier mejora extra nunca desplaza algo obligatorio.

## 2. Datos
1. Sin campos `null` ni vacíos de relleno. Lo que no aplica no existe.
2. Todo documento pasa por doble validación: Zod en la aplicación y `$jsonSchema` en Atlas.
3. Los nombres de campo son exactamente los del enunciado.
4. Todo cambio multi-campo sobre un documento es una sola operación atómica.
5. Los binarios nunca se guardan en MongoDB, solo metadatos y referencias.

## 3. Arquitectura y calidad
1. Arquitectura limpia: el dominio no conoce Express, Mongo ni Supabase.
2. Una tarea a la vez, con prueba primero.
3. Código simple y legible. Se prefiere lo que un estudiante pueda explicar línea por línea en la defensa oral.
4. Cada requisito de la spec se valida RF por RF antes de cerrar el proyecto.

## 4. Seguridad
1. Ninguna clave, token ni contraseña en git. `.env` fuera del repo; `.env.example` sí.
2. Contraseñas con bcrypt, sesión con JWT, permisos por rol en el servidor (la UI solo oculta).
3. Usuario de BD con el mínimo privilegio. Bucket privado con URLs firmadas de vida corta.
4. Subidas: solo jpeg, png y pdf, máximo 4 MB.

## 5. Proceso (SDD)
Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación. No se avanza de fase sin aprobación de Kevin. Los cambios de requisitos van primero a la spec, luego al plan y las tareas, y al final al código.

## 6. Equipo
Es un trabajo en equipo con defensa individual. La documentación (`MEMORY.md`, spec, guía de defensa) debe permitir que cualquier integrante entienda cualquier parte del sistema.
