# UTM Desk NoSQL Cloud

Sistema integral de gestión, resolución y analítica de incidencias del campus de la **Universidad Tecnológica Metropolitana (UTM)**, implementado sobre **MongoDB Atlas** y **Supabase Storage**.

Proyecto desarrollado para la materia de **Bases de Datos en la Nube · Unidad II**.

---

## 👥 Equipo de Desarrollo
- **Arroyo León Luis Diego**
- **Can Domínguez Víctor Emmanuel**
- **Montalvo Canché Emir Emanuel**
- **Vargas Guzmán Kevin Aarón**

---

## 🚀 Arquitectura y Tecnologías

### Backend (`server/`)
- **Entorno:** Node.js (>=20) con módulos ECMAScript (`type: "module"`).
- **Framework:** Express 5 con middleware de seguridad (`helmet`, `cors`, `express-rate-limit`).
- **Base de Datos:** Driver oficial nativo de **MongoDB** (sin Mongoose para aprovechar nativamente `$jsonSchema`, índices multikey, texto ponderado, TTL, y pipelines de agregación).
- **Almacenamiento de Evidencias:** **Supabase Storage** con bucket privado y generación dinámica de URLs firmadas temporales.
- **Autenticación y Seguridad:** JWT (JSON Web Tokens), hashing con `bcryptjs`, validación estricta en dos capas con **Zod** y `$jsonSchema`, y verificación de tipos MIME por firma de bytes (`file-type`).
- **Testing:** Vitest (pruebas unitarias y de integración) y Newman (pruebas E2E de la colección Postman).

### Frontend (`web/`)
- **Framework:** React 19 + Vite.
- **Estilos:** Tailwind CSS v4 con sistema de tokens visuales y diseño responsivo inspirado en la identidad institucional UTM.
- **Navegación:** React Router 7 con guardas de ruta según el rol del usuario.
- **Visualización de Datos:** Recharts para tableros analíticos e indicadores de incidencias por edificio y etiquetas.

### Nube y Despliegue
- **Base de Datos:** MongoDB Atlas (Cluster AWS).
- **Storage:** Supabase Storage (Bucket `evidencias`).
- **Hosting:** Vercel
  - **API:** [https://utm-desk-api.vercel.app/api](https://utm-desk-api.vercel.app/api)
  - **Web:** [https://utm-desk-web.vercel.app](https://utm-desk-web.vercel.app)

---

## 📁 Estructura del Repositorio

| Directorio | Descripción |
|---|---|
| `server/` | API REST Express, controladores, dominio, repositorios Mongo y scripts de mantenimiento |
| `web/` | Aplicación SPA React + Vite + Tailwind v4 |
| `docs/` | Enunciado, constitución del equipo, análisis de seguridad, diseño UI y documentación técnica |
| `specs/001-utm-desk/` | Especificación de requerimientos (`spec.md`), plan de arquitectura (`plan.md`) y desglose de tareas (`tasks.md`) |
| `postman/` | Colección Postman oficial (`UTM-Desk.postman_collection.json`), variables de entorno y fixtures |
| `entregables/` | Script maestro `mongosh`, exportación JSON (`incidencias_campus.json`) y PDFs de entrega |

---

## 🔑 Cuentas Demo y Roles

El seed incluye usuarios listos para probar cada nivel de privilegios y flujos de trabajo en el sistema:

| Correo | Rol / Tipo | Acceso y Capacidades |
|---|---|---|
| `ana.pech@utmetropolitana.edu.mx` | Reportante (Docente) | Crear incidencias, ver solo sus propios reportes, adjuntar evidencias |
| `daniela.chan@utmetropolitana.edu.mx` | Reportante (Estudiante) | Crear incidencias, seguimiento de sus reportes, adjuntar evidencias |
| `pedro.canul@utmetropolitana.edu.mx` | Reportante (Administrativo) | Crear incidencias, seguimiento de sus reportes, adjuntar evidencias |
| `luis.cauich@utmetropolitana.edu.mx` | Técnico | Ver todas las incidencias, cambiar estados, registrar horas y bitácora, gestionar tags |
| `marisol.be@utmetropolitana.edu.mx` | Técnico | Ver todas las incidencias, seguimiento operativo, bitácora y evidencias |
| `roberto.mena@utmetropolitana.edu.mx` | Coordinador | Control total: editar incidencias, reasignar, cerrar, eliminar y consultar analítica |
| `laura.cetina@utmetropolitana.edu.mx` | Directivo | Modo lectura general, búsqueda global y tableros de analítica de campus |

> **Contraseña predeterminada:** La contraseña de todas las cuentas demo es el valor configurado en la variable `SEED_DEFAULT_PASSWORD` de `server/.env`.

---

## ⚙️ Requisitos Previos

- **Node.js** >= 20.x
- **npm** >= 10.x
- Conexión a Internet (para conectar con MongoDB Atlas y Supabase Storage)

---

## 🛠️ Puesta en Marcha Local

### 1. Variables de Entorno

Asegurarse de contar con el archivo `server/.env` configurado:

```ini
PORT=4000
CORS_ORIGIN=http://localhost:5173

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster0.lhgl0b9.mongodb.net/
MONGODB_DB=utmdesk

# Seguridad JWT
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES_IN=8h
SEED_DEFAULT_PASSWORD=tu_password_seed

# Supabase Storage
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_BUCKET=evidencias
SIGNED_URL_TTL_SECONDS=3600
```

> **Frontend (`web/`):** Si no se define archivo `.env` en `web/`, por defecto consumirá la API local en `http://localhost:4000/api`. Si se desea probar el frontend local contra la API desplegada en producción, se puede crear `web/.env` con:
> ```ini
> VITE_API_URL=https://utm-desk-api.vercel.app/api
> ```

---

### 2. Instalación de Dependencias

Ejecutar en la raíz del proyecto o en cada subcarpeta:

```bash
# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del cliente web
cd ../web
npm install
```

---

### 3. Ejecutar el Sistema

Se deben abrir dos terminales independientes:

#### Terminal 1 — Servidor (Backend API)
```bash
cd server
npm run start
# O para desarrollo con recarga:
# npm run dev
```
La API iniciará en: **`http://localhost:4000/api`**

#### Terminal 2 — Cliente Web (Frontend)
```bash
cd web
npm run dev
```
La interfaz estará accesible en: **`http://localhost:5173`**

---

## 📜 Scripts Disponibles en `server/`

| Comando | Descripción |
|---|---|
| `npm run start` | Inicia el servidor Express en producción / modo directo |
| `npm run dev` | Inicia el servidor en modo desarrollo (`node --watch`) |
| `npm run db:ping` | Verifica la conectividad con MongoDB Atlas y el bucket de Supabase |
| `npm run db:setup` | Aplica las colecciones, validadores `$jsonSchema` e índices en Atlas |
| `npm run db:seed` | Carga los datos de prueba (usuarios, incidencias y evidencias sintéticas) |
| `npm run db:verify` | Ejecuta la batería de 16 verificaciones de integridad en la base de datos |
| `npm run db:export` | Exporta `incidencias_campus.json` y el `script-maestro.js` para `mongosh` |
| `npm run demo:ttl` | Demuestra en vivo la expiración y purga automática por índice TTL (60 días) |
| `npm test` | Ejecuta la suite completa de pruebas automatizadas con Vitest |
| `npm run test:api` | Ejecuta las 63 pruebas de integración E2E con Newman |

---

## 🔒 Características Principales de Base de Datos (NoSQL)

1. **Modelo Documental Polimórfico:** Almacenamiento unificado de incidencias con un bloque `detalle_especifico` validado dinámicamente según la categoría (`computo_redes`, `infraestructura`, `sistemas_academicos`).
2. **Índices Optimizados:**
   - Índice compuesto: `{ "categoria": 1, "estado": 1, "ubicacion.edificio": 1, "fecha_creacion": -1 }`
   - Índice Multikey: `{ "tags": 1 }`
   - Índice Textual Ponderado en Español: `{ "titulo": "text", "descripcion": "text" }`
   - Índice TTL: `{ "fecha_resolucion": 1 }` con `expireAfterSeconds: 5184000` (60 días).
3. **Operaciones Atómicas:**
   - `$inc` con `upsert` para generación de números de folio y conteos anuales/diarios sin dependencias de servicios externos.
   - `$push`, `$pull` y `$addToSet` para bitácoras, evidencias y etiquetas.
4. **Pipelines de Agregación Analítica:**
   - Pipeline de métricas por edificio con cálculo de tiempos de resolución, promedio de horas y totalización.
   - Pipeline de frecuencia y distribución de etiquetas de incidencias.
