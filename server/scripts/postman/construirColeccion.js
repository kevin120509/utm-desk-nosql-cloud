// Genera la colección de Postman (v2.1) y el environment local. Se genera por código para
// que sea fácil de mantener y revisar; el resultado se versiona en `postman/`.
//
//   npm run postman:build
//
// Requiere los datos del seed (`npm run db:seed -- --yes`): usa sus cuentas de demostración.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crearPng } from "../seed/archivosMuestra.js";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const carpetaPostman = resolve(raiz, "postman");

// ---------------------------------------------------------------------------
// Ayudas para armar peticiones
// ---------------------------------------------------------------------------
const TOKENS = {
  tecnico: "{{token_tecnico}}",
  coordinador: "{{token_coordinador}}",
  directivo: "{{token_directivo}}",
  ana: "{{token_ana}}",
  daniela: "{{token_daniela}}",
};

/** Convierte un bloque de pruebas (arreglo de líneas o texto) en `event` de Postman. */
const evento = (listen, codigo) =>
  codigo ? [{ listen, script: { type: "text/javascript", exec: codigo.trim().split("\n") } }] : [];

/**
 * @param {{nombre: string, descripcion: string, metodo: string, ruta: string, token?: string,
 *          cuerpo?: object, formdata?: object[], pruebas: string, previo?: string}} p
 */
function peticion(p) {
  const cabeceras = [];
  if (p.token) cabeceras.push({ key: "Authorization", value: `Bearer ${p.token}`, type: "text" });
  const request = {
    method: p.metodo,
    header: cabeceras,
    url: `{{base_url}}${p.ruta}`,
    description: p.descripcion,
  };
  if (p.cuerpo !== undefined) {
    request.header.push({ key: "Content-Type", value: "application/json", type: "text" });
    request.body = { mode: "raw", raw: JSON.stringify(p.cuerpo, null, 2), options: { raw: { language: "json" } } };
  } else if (p.formdata) {
    request.body = { mode: "formdata", formdata: p.formdata };
  }
  return {
    name: p.nombre,
    event: [...evento("prerequest", p.previo), ...evento("test", p.pruebas)],
    request,
  };
}

// Fragmentos de prueba reutilizables.
const t = {
  estado: (codigo, texto) => `pm.test("${texto ?? `Responde ${codigo}`}", () => pm.response.to.have.status(${codigo}));`,
  json: `const cuerpo = pm.response.json();`,
  errorCodigo: (c) =>
    `pm.test("El error tiene el formato { error: { codigo, mensaje } } con codigo ${c}", () => {
  const e = pm.response.json().error;
  pm.expect(e).to.be.an("object");
  pm.expect(e.codigo).to.eql("${c}");
  pm.expect(e.mensaje).to.be.a("string").and.not.empty;
});`,
};

// Cuerpos de ejemplo
const incidenciaRedes = {
  titulo: "Prueba Postman: filtración eléctrica en el switch del laboratorio",
  descripcion: "Creada por la colección de Postman para validar el ciclo completo de una incidencia.",
  categoria: "computo_redes",
  prioridad: "alta",
  ubicacion: { edificio: "Laboratorios de Cómputo", piso: 1, espacio: "LC-9" },
  detalle_especifico: { tipo_falla: "switch", direccion_ip: "10.20.9.1", vlan: 90, puerto_uplink: "Gi1/0/24", equipos_afectados: 12 },
};

// ---------------------------------------------------------------------------
// Carpetas (una por caso de uso / requisito)
// ---------------------------------------------------------------------------
const carpetas = [];

carpetas.push({
  name: "0. Salud",
  description: "La API responde. Sin autenticación.",
  item: [
    peticion({
      nombre: "GET /health",
      descripcion: "Comprobación de vida (la usa también el despliegue).",
      metodo: "GET",
      ruta: "/health",
      pruebas: `${t.estado(200, "200 OK")}
pm.test("Devuelve { ok: true }", () => pm.expect(pm.response.json()).to.eql({ ok: true }));`,
    }),
  ],
});

const login = (clave, variableCorreo, variableToken, descripcion) =>
  peticion({
    nombre: `POST /auth/login — ${clave}`,
    descripcion,
    metodo: "POST",
    ruta: "/auth/login",
    cuerpo: { correo: `{{${variableCorreo}}}`, password: "{{password}}" },
    pruebas: `${t.estado(200, "RF-13: 200 OK con credenciales válidas")}
${t.json}
pm.test("Devuelve un token y el usuario con su rol, sin hash de contraseña", () => {
  pm.expect(cuerpo.token).to.be.a("string").and.not.empty;
  pm.expect(cuerpo.usuario).to.include.keys("id", "nombre", "correo", "rol");
  pm.expect(JSON.stringify(cuerpo)).to.not.include("password_hash");
});
pm.collectionVariables.set("${variableToken}", cuerpo.token);`,
  });

carpetas.push({
  name: "1. Sesión y permisos (RF-13)",
  description: "Login por rol (guarda los tokens), 401 y 403.",
  item: [
    login("técnico", "correo_tecnico", "token_tecnico", "Guarda `token_tecnico`."),
    login("coordinador", "correo_coordinador", "token_coordinador", "Guarda `token_coordinador`."),
    login("directivo", "correo_directivo", "token_directivo", "Guarda `token_directivo`."),
    login("reportante Ana (docente)", "correo_ana", "token_ana", "Guarda `token_ana`. Es la dueña de la incidencia de la prueba."),
    login("reportante Daniela (estudiante)", "correo_daniela", "token_daniela", "Guarda `token_daniela`. Sirve para probar acceso a incidencias ajenas."),
    peticion({
      nombre: "POST /auth/login — contraseña incorrecta (401)",
      descripcion: "Mismo error genérico que un correo inexistente: no revela si la cuenta existe.",
      metodo: "POST",
      ruta: "/auth/login",
      cuerpo: { correo: "{{correo_ana}}", password: "no-es-la-contraseña" },
      pruebas: `${t.estado(401, "RF-13: 401 Unauthorized")}
${t.errorCodigo("CREDENCIALES_INVALIDAS")}`,
    }),
    peticion({
      nombre: "POST /auth/login — cuerpo inválido (400)",
      descripcion: "Falta la contraseña: error de validación con detalles por campo.",
      metodo: "POST",
      ruta: "/auth/login",
      cuerpo: { correo: "{{correo_ana}}" },
      pruebas: `${t.estado(400, "400 Bad Request")}
${t.errorCodigo("VALIDACION")}`,
    }),
    peticion({
      nombre: "GET /auth/me",
      descripcion: "Devuelve el usuario de la sesión.",
      metodo: "GET",
      ruta: "/auth/me",
      token: TOKENS.ana,
      pruebas: `${t.estado(200, "200 OK")}
pm.test("Devuelve el usuario con rol reportante", () => {
  const u = pm.response.json().usuario;
  pm.expect(u.rol).to.eql("reportante");
  pm.expect(u).to.not.have.property("password_hash");
});`,
    }),
    peticion({
      nombre: "GET /incidencias — sin token (401)",
      descripcion: "Toda ruta de incidencias exige sesión.",
      metodo: "GET",
      ruta: "/incidencias",
      pruebas: `${t.estado(401, "RF-13: 401 sin token")}
${t.errorCodigo("NO_AUTENTICADO")}`,
    }),
    peticion({
      nombre: "GET /incidencias — token inválido (401)",
      descripcion: "Un token mal formado se rechaza igual.",
      metodo: "GET",
      ruta: "/incidencias",
      token: "token.invalido.xyz",
      pruebas: `${t.estado(401, "RF-13: 401 con token inválido")}
${t.errorCodigo("NO_AUTENTICADO")}`,
    }),
    peticion({
      nombre: "GET /analitica/edificios — reportante (403)",
      descripcion: "El rol reportante no tiene permiso para la analítica.",
      metodo: "GET",
      ruta: "/analitica/edificios",
      token: TOKENS.ana,
      pruebas: `${t.estado(403, "RF-13: 403 Forbidden")}
${t.errorCodigo("SIN_PERMISO")}`,
    }),
  ],
});

carpetas.push({
  name: "2. Registrar incidencia (CU-01 · RF-01/02/03)",
  description: "Alta con detalle polimórfico, validación y permisos. Guarda `codigo` para las carpetas siguientes.",
  item: [
    peticion({
      nombre: "POST /incidencias — alta válida (201)",
      descripcion: "Alta de una incidencia de cómputo y redes. El reportante sale de la sesión. Guarda `codigo`.",
      metodo: "POST",
      ruta: "/incidencias",
      token: TOKENS.ana,
      cuerpo: incidenciaRedes,
      pruebas: `${t.estado(201, "RF-01: 201 Created")}
${t.json}
pm.test("Tiene código INC-AAAA-NNNN, estado abierta y consecutivo diario", () => {
  pm.expect(cuerpo.codigo).to.match(/^INC-\\d{4}-\\d{4,}$/);
  pm.expect(cuerpo.estado).to.eql("abierta");
  pm.expect(cuerpo.consecutivo_diario).to.be.a("number").and.at.least(1);
});
pm.test("Inicializa bitácora, etiquetas, evidencias y horas", () => {
  pm.expect(cuerpo.historial_seguimiento).to.have.lengthOf(1);
  pm.expect(cuerpo.tags).to.eql([]);
  pm.expect(cuerpo.evidencias_adjuntas).to.eql([]);
  pm.expect(cuerpo.horas_invertidas).to.eql(0);
});
pm.test("El reportante viene de la sesión (Ana), no del cuerpo", () => {
  pm.expect(cuerpo.reportante.nombre).to.include("Ana");
});
pm.test("No hay campos null ni fecha_resolucion", () => {
  pm.expect(JSON.stringify(cuerpo)).to.not.include("null");
  pm.expect(cuerpo).to.not.have.property("fecha_resolucion");
});
pm.collectionVariables.set("codigo", cuerpo.codigo);`,
    }),
    peticion({
      nombre: "POST /incidencias — detalle de otra categoría (400)",
      descripcion: "RF-02: el `detalle_especifico` de infraestructura no corresponde a la categoría computo_redes.",
      metodo: "POST",
      ruta: "/incidencias",
      token: TOKENS.ana,
      cuerpo: {
        ...incidenciaRedes,
        detalle_especifico: { tipo_dano: "filtracion", riesgo_seguridad: "bajo", requiere_contratista: false },
      },
      pruebas: `${t.estado(400, "RF-02: 400 Bad Request")}
${t.errorCodigo("VALIDACION")}
pm.test("Incluye detalles por campo", () => pm.expect(pm.response.json().error.detalles).to.be.an("object").and.not.empty);`,
    }),
    peticion({
      nombre: "POST /incidencias — campo extra reportante (400)",
      descripcion: "El cliente no puede fijar el reportante ni el estado: los campos extra se rechazan.",
      metodo: "POST",
      ruta: "/incidencias",
      token: TOKENS.ana,
      cuerpo: { ...incidenciaRedes, reportante: { nombre: "Otra persona" }, estado: "cerrada" },
      pruebas: `${t.estado(400, "RF-02: 400 con campos extra")}
${t.errorCodigo("VALIDACION")}`,
    }),
    peticion({
      nombre: "POST /incidencias — campo obligatorio faltante (400)",
      descripcion: "Sin título.",
      metodo: "POST",
      ruta: "/incidencias",
      token: TOKENS.ana,
      cuerpo: (({ titulo, ...resto }) => resto)(incidenciaRedes),
      pruebas: `${t.estado(400, "RF-02: 400 Bad Request")}
pm.test("El detalle menciona el campo titulo", () => pm.expect(pm.response.json().error.detalles).to.have.property("titulo"));`,
    }),
    peticion({
      nombre: "POST /incidencias — directivo (403)",
      descripcion: "El directivo es de solo lectura.",
      metodo: "POST",
      ruta: "/incidencias",
      token: TOKENS.directivo,
      cuerpo: incidenciaRedes,
      pruebas: `${t.estado(403, "RF-13: 403 Forbidden")}
${t.errorCodigo("SIN_PERMISO")}`,
    }),
    peticion({
      nombre: "POST /incidencias — sin token (401)",
      descripcion: "Sin sesión no se puede crear.",
      metodo: "POST",
      ruta: "/incidencias",
      cuerpo: incidenciaRedes,
      pruebas: `${t.estado(401, "RF-13: 401 Unauthorized")}`,
    }),
  ],
});

carpetas.push({
  name: "3. Consultar y listar (RF-05/06)",
  description: "Lista filtrada y paginada, expediente completo y permisos por dueño.",
  item: [
    peticion({
      nombre: "GET /incidencias — técnico ve todas (200)",
      descripcion: "Lista paginada, más reciente primero.",
      metodo: "GET",
      ruta: "/incidencias?limite=5",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(200, "RF-06: 200 OK")}
${t.json}
pm.test("Devuelve { datos, total, pagina } con 5 como máximo", () => {
  pm.expect(cuerpo.datos).to.be.an("array").with.length.within(1, 5);
  pm.expect(cuerpo.total).to.be.a("number").and.at.least(cuerpo.datos.length);
  pm.expect(cuerpo.pagina).to.eql(1);
});
pm.test("La lista es ligera (sin bitácora ni evidencias) y ordenada por fecha desc", () => {
  pm.expect(cuerpo.datos[0]).to.not.have.property("historial_seguimiento");
  const f = cuerpo.datos.map((d) => new Date(d.fecha_creacion).getTime());
  pm.expect(f).to.eql([...f].sort((a, b) => b - a));
});`,
    }),
    peticion({
      nombre: "GET /incidencias?categoria&estado — filtros (200)",
      descripcion: "Filtros combinados (usa el índice compuesto).",
      metodo: "GET",
      ruta: "/incidencias?categoria=computo_redes&estado=abierta",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(200)}
pm.test("Todos los resultados cumplen el filtro", () => {
  for (const d of pm.response.json().datos) {
    pm.expect(d.categoria).to.eql("computo_redes");
    pm.expect(d.estado).to.eql("abierta");
  }
});`,
    }),
    peticion({
      nombre: "GET /incidencias — reportante solo ve las suyas (200)",
      descripcion: "Daniela solo recibe sus propias incidencias.",
      metodo: "GET",
      ruta: "/incidencias?limite=50",
      token: TOKENS.daniela,
      pruebas: `${t.estado(200)}
pm.test("Todas las incidencias son de Daniela", () => {
  const datos = pm.response.json().datos;
  pm.expect(datos).to.be.an("array");
  for (const d of datos) pm.expect(d.reportante.nombre).to.include("Daniela");
});`,
    }),
    peticion({
      nombre: "GET /incidencias — parámetros inválidos (400)",
      descripcion: "Límite fuera de rango y estado desconocido.",
      metodo: "GET",
      ruta: "/incidencias?limite=999&estado=nada",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(400)}
${t.errorCodigo("VALIDACION")}
pm.test("Detalla cada parámetro inválido", () => {
  const d = pm.response.json().error.detalles;
  pm.expect(d).to.have.property("limite");
  pm.expect(d).to.have.property("estado");
});`,
    }),
    peticion({
      nombre: "GET /incidencias/:codigo — dueña (200)",
      descripcion: "Expediente completo en una sola lectura.",
      metodo: "GET",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.ana,
      pruebas: `${t.estado(200, "RF-05: 200 OK")}
${t.json}
pm.test("Es el documento completo", () => {
  pm.expect(cuerpo.codigo).to.eql(pm.collectionVariables.get("codigo"));
  pm.expect(cuerpo).to.include.keys("detalle_especifico", "historial_seguimiento", "evidencias_adjuntas", "tags", "reportante", "ubicacion");
  pm.expect(cuerpo.detalle_especifico.tipo_falla).to.eql("switch");
});`,
    }),
    peticion({
      nombre: "GET /incidencias/:codigo — reportante ajeno (403)",
      descripcion: "Daniela no puede ver la incidencia de Ana.",
      metodo: "GET",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.daniela,
      pruebas: `${t.estado(403, "RF-05: 403 Forbidden")}
${t.errorCodigo("SIN_PERMISO")}`,
    }),
    peticion({
      nombre: "GET /incidencias/:codigo — no existe (404)",
      descripcion: "También es lo que verá la UI al abrir un enlace de una incidencia ya depurada por el TTL.",
      metodo: "GET",
      ruta: "/incidencias/INC-2026-9998",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(404, "404 Not Found")}
${t.errorCodigo("NO_ENCONTRADO")}`,
    }),
  ],
});

carpetas.push({
  name: "4. Etiquetas (CU-04 · RF-08)",
  description: "$addToSet sin duplicados y $pull.",
  item: [
    peticion({
      nombre: "POST /incidencias/:codigo/tags — agrega y normaliza (200)",
      descripcion: "\" Switch \" se guarda como `switch`.",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/tags",
      token: TOKENS.tecnico,
      cuerpo: { tag: " Switch " },
      pruebas: `${t.estado(200, "RF-08: 200 OK")}
pm.test("La etiqueta quedó en minúsculas y sin espacios", () => pm.expect(pm.response.json().tags).to.include("switch"));`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/tags — repetida con otro formato (200, sin duplicar)",
      descripcion: "\"SWITCH\" es la misma etiqueta: `$addToSet` deja el arreglo igual.",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/tags",
      token: TOKENS.tecnico,
      cuerpo: { tag: "SWITCH" },
      pruebas: `${t.estado(200)}
pm.test("Sigue habiendo una sola etiqueta switch", () => {
  const tags = pm.response.json().tags;
  pm.expect(tags.filter((x) => x === "switch")).to.have.lengthOf(1);
});`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/tags — etiqueta demasiado corta (400)",
      descripcion: "Mínimo 2 caracteres.",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/tags",
      token: TOKENS.tecnico,
      cuerpo: { tag: "a" },
      pruebas: `${t.estado(400)}
${t.errorCodigo("VALIDACION")}`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/tags — reportante (403)",
      descripcion: "Solo técnico y coordinador gestionan etiquetas.",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/tags",
      token: TOKENS.ana,
      cuerpo: { tag: "wifi" },
      pruebas: `${t.estado(403)}
${t.errorCodigo("SIN_PERMISO")}`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/tags — incidencia inexistente (404)",
      descripcion: "",
      metodo: "POST",
      ruta: "/incidencias/INC-2026-9998/tags",
      token: TOKENS.tecnico,
      cuerpo: { tag: "wifi" },
      pruebas: `${t.estado(404)}`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/tags — segunda etiqueta (200)",
      descripcion: "Prepara el DELETE siguiente.",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/tags",
      token: TOKENS.coordinador,
      cuerpo: { tag: "sin-red" },
      pruebas: `${t.estado(200)}
pm.test("Hay dos etiquetas", () => pm.expect(pm.response.json().tags).to.have.members(["switch", "sin-red"]));`,
    }),
    peticion({
      nombre: "DELETE /incidencias/:codigo/tags/:tag — quita (200)",
      descripcion: "`$pull`.",
      metodo: "DELETE",
      ruta: "/incidencias/{{codigo}}/tags/sin-red",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(200, "RF-08: 200 OK")}
pm.test("La etiqueta ya no está", () => pm.expect(pm.response.json().tags).to.eql(["switch"]));`,
    }),
  ],
});

carpetas.push({
  name: "5. Evidencias (CU-02 · RF-04)",
  description: "Subida multipart al bucket privado de Supabase. Requiere la carpeta `fixtures/` junto a la colección.",
  item: [
    peticion({
      nombre: "POST /incidencias/:codigo/evidencias — PNG válido (201)",
      descripcion: "La dueña sube una imagen. El tipo se detecta por los bytes; se devuelve una URL firmada temporal.",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/evidencias",
      token: TOKENS.ana,
      formdata: [{ key: "archivo", type: "file", src: "fixtures/evidencia.png" }],
      pruebas: `${t.estado(201, "RF-04: 201 Created")}
${t.json}
pm.test("Devuelve los metadatos de la evidencia", () => {
  pm.expect(cuerpo).to.include.keys("nombre_archivo", "tipo_mime", "peso_kb", "storage_path", "url_storage", "url_expira", "fecha_carga");
  pm.expect(cuerpo.tipo_mime).to.eql("image/png");
  pm.expect(cuerpo.storage_path).to.match(/^INC-\\d{4}-\\d{4,}\\//);
  pm.expect(cuerpo.url_storage).to.match(/^https:\\/\\//);
});`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/evidencias — texto renombrado como .png (400)",
      descripcion: "Se valida el tipo REAL por los bytes, no la extensión. No se sube nada.",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/evidencias",
      token: TOKENS.ana,
      formdata: [{ key: "archivo", type: "file", src: "fixtures/no-es-imagen.png" }],
      pruebas: `${t.estado(400, "RF-04: 400 Bad Request")}
${t.errorCodigo("ARCHIVO_INVALIDO")}`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/evidencias — sin archivo (400)",
      descripcion: "",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/evidencias",
      token: TOKENS.ana,
      formdata: [{ key: "nota", type: "text", value: "sin archivo" }],
      pruebas: `${t.estado(400)}
${t.errorCodigo("ARCHIVO_INVALIDO")}`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/evidencias — reportante ajeno (403)",
      descripcion: "Daniela no puede adjuntar a la incidencia de Ana.",
      metodo: "POST",
      ruta: "/incidencias/{{codigo}}/evidencias",
      token: TOKENS.daniela,
      formdata: [{ key: "archivo", type: "file", src: "fixtures/evidencia.png" }],
      pruebas: `${t.estado(403)}
${t.errorCodigo("SIN_PERMISO")}`,
    }),
    peticion({
      nombre: "POST /incidencias/:codigo/evidencias — incidencia inexistente (404)",
      descripcion: "",
      metodo: "POST",
      ruta: "/incidencias/INC-2026-9998/evidencias",
      token: TOKENS.tecnico,
      formdata: [{ key: "archivo", type: "file", src: "fixtures/evidencia.png" }],
      pruebas: `${t.estado(404)}`,
    }),
    peticion({
      nombre: "GET /incidencias/:codigo — la evidencia quedó en el expediente (200)",
      descripcion: "La URL firmada se regenera al leer.",
      metodo: "GET",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(200)}
pm.test("Hay exactamente una evidencia con URL firmada", () => {
  const ev = pm.response.json().evidencias_adjuntas;
  pm.expect(ev).to.have.lengthOf(1);
  pm.expect(ev[0].url_storage).to.match(/^https:\\/\\/.+token=/);
});`,
    }),
  ],
});

carpetas.push({
  name: "6. Estado y bitácora (CU-03 · RF-07)",
  description: "Cambio de estado atómico ($set + $push + $inc), transiciones y concurrencia.",
  item: [
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — reportante (403)",
      descripcion: "Solo técnico y coordinador cambian el estado.",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}/estado",
      token: TOKENS.ana,
      cuerpo: { estado_nuevo: "en proceso", horas: 1, comentario: "Intento no autorizado" },
      pruebas: `${t.estado(403)}
${t.errorCodigo("SIN_PERMISO")}`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — abierta a en proceso (200)",
      descripcion: "Un solo `updateOne` con $set, $push e $inc.",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}/estado",
      token: TOKENS.tecnico,
      cuerpo: { estado_nuevo: "en proceso", horas: 1.5, comentario: "Revisando el uplink del switch" },
      pruebas: `${t.estado(200, "RF-07: 200 OK")}
${t.json}
pm.test("Estado, horas y bitácora actualizados", () => {
  pm.expect(cuerpo.estado).to.eql("en proceso");
  pm.expect(cuerpo.horas_invertidas).to.eql(1.5);
  pm.expect(cuerpo.historial_seguimiento).to.have.lengthOf(2);
  const ultima = cuerpo.historial_seguimiento[1];
  pm.expect(ultima.estado_anterior).to.eql("abierta");
  pm.expect(ultima.estado_nuevo).to.eql("en proceso");
});
pm.test("Se asignó al técnico y todavía no hay fecha_resolucion", () => {
  pm.expect(cuerpo.asignado_a.nombre).to.be.a("string");
  pm.expect(cuerpo).to.not.have.property("fecha_resolucion");
});`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — horas fuera de rango (400)",
      descripcion: "Más de 24 horas por intervención.",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}/estado",
      token: TOKENS.tecnico,
      cuerpo: { estado_nuevo: "en espera", horas: 99, comentario: "Demasiadas horas" },
      pruebas: `${t.estado(400, "RF-07: 400 Bad Request")}
pm.test("El detalle menciona horas", () => pm.expect(pm.response.json().error.detalles).to.have.property("horas"));`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — técnico no puede cerrar (400)",
      descripcion: "Cerrar es solo del coordinador y solo desde resuelta.",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}/estado",
      token: TOKENS.tecnico,
      cuerpo: { estado_nuevo: "cerrada", horas: 0, comentario: "Intento de cierre" },
      pruebas: `${t.estado(400)}
${t.errorCodigo("TRANSICION_INVALIDA")}`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — dos escrituras simultáneas (solo una se aplica)",
      descripcion:
        "La petición y una segunda enviada en paralelo desde el pre-request intentan cambiar el estado desde `en proceso`. " +
        "El filtro por estado leído garantiza que solo una se aplique: la otra recibe 409 CONFLICTO (leyó el estado " +
        "antes del cambio) o 400 (leyó el estado ya cambiado). Nunca se aplican las dos. La prueba determinista del 409 " +
        "está en las pruebas de integración (`actualizarEstado.integracion.test.js`).",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}/estado",
      token: TOKENS.tecnico,
      cuerpo: { estado_nuevo: "en espera", horas: 1, comentario: "Concurrencia A: esperando refacción" },
      previo: `const base = pm.variables.get("base_url");
pm.sendRequest({
  url: base + "/incidencias/" + pm.collectionVariables.get("codigo") + "/estado",
  method: "PATCH",
  header: { "Content-Type": "application/json", Authorization: "Bearer " + pm.collectionVariables.get("token_tecnico") },
  body: { mode: "raw", raw: JSON.stringify({ estado_nuevo: "en espera", horas: 2, comentario: "Concurrencia B: esperando refacción" }) },
}, (err, res) => {
  pm.collectionVariables.set("estado_paralelo", err ? "error" : String(res.code));
});`,
      pruebas: `const propio = pm.response.code;
pm.test("La petición propia respondió 200 o 409/400 (nunca 5xx)", () => pm.expect([200, 400, 409]).to.include(propio));
pm.test("Exactamente UNA de las dos escrituras se aplicó", () => {
  const otro = Number(pm.collectionVariables.get("estado_paralelo"));
  pm.expect([200, 400, 409]).to.include(otro);
  const aplicadas = [propio, otro].filter((c) => c === 200).length;
  pm.expect(aplicadas).to.eql(1);
});`,
    }),
    peticion({
      nombre: "GET /incidencias/:codigo — horas y bitácora coherentes tras la concurrencia (200)",
      descripcion: "Con una sola escritura aplicada, las horas son 1.5 + (1 o 2) y la bitácora tiene 3 entradas.",
      metodo: "GET",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(200)}
${t.json}
pm.test("Estado en espera, 3 entradas en la bitácora y horas de una sola escritura", () => {
  pm.expect(cuerpo.estado).to.eql("en espera");
  pm.expect(cuerpo.historial_seguimiento).to.have.lengthOf(3);
  pm.expect([2.5, 3.5]).to.include(cuerpo.horas_invertidas);
});`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — en espera a resuelta (200)",
      descripcion: "Al resolver se asienta `fecha_resolucion` (la que usa el TTL de 60 días).",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}/estado",
      token: TOKENS.tecnico,
      cuerpo: { estado_nuevo: "resuelta", horas: 2, comentario: "Se reemplazó el módulo SFP del uplink" },
      pruebas: `${t.estado(200)}
${t.json}
pm.test("Resuelta, con fecha_resolucion como fecha válida", () => {
  pm.expect(cuerpo.estado).to.eql("resuelta");
  pm.expect(cuerpo.fecha_resolucion).to.be.a("string");
  pm.expect(new Date(cuerpo.fecha_resolucion).toString()).to.not.eql("Invalid Date");
});`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — coordinador cierra (200)",
      descripcion: "resuelta a cerrada solo por el coordinador; conserva la fecha_resolucion.",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}/estado",
      token: TOKENS.coordinador,
      cuerpo: { estado_nuevo: "cerrada", horas: 0, comentario: "Cierre administrativo" },
      pruebas: `${t.estado(200)}
pm.test("Cerrada y con fecha_resolucion conservada", () => {
  const c = pm.response.json();
  pm.expect(c.estado).to.eql("cerrada");
  pm.expect(c.fecha_resolucion).to.be.a("string");
});`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — cerrada es final (400)",
      descripcion: "Nada se reabre.",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}/estado",
      token: TOKENS.coordinador,
      cuerpo: { estado_nuevo: "en proceso", horas: 0, comentario: "Intento de reabrir" },
      pruebas: `${t.estado(400)}
${t.errorCodigo("TRANSICION_INVALIDA")}`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo/estado — incidencia inexistente (404)",
      descripcion: "",
      metodo: "PATCH",
      ruta: "/incidencias/INC-2026-9998/estado",
      token: TOKENS.tecnico,
      cuerpo: { estado_nuevo: "en proceso", horas: 1, comentario: "No existe" },
      pruebas: `${t.estado(404)}`,
    }),
  ],
});

carpetas.push({
  name: "7. Búsqueda textual (CU-05 · RF-09)",
  description: "`$text` con índice ponderado en español y `textScore`.",
  item: [
    peticion({
      nombre: "GET /incidencias/buscar?q=filtración (200)",
      descripcion: "Devuelve resultados con `score`, de mayor a menor relevancia. Encuentra también la incidencia de la prueba.",
      metodo: "GET",
      ruta: "/incidencias/buscar?q=filtraci%C3%B3n",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(200, "RF-09: 200 OK")}
${t.json}
pm.test("Hay resultados con score y orden descendente", () => {
  pm.expect(cuerpo.datos).to.be.an("array").and.not.empty;
  const s = cuerpo.datos.map((d) => d.score);
  for (const x of s) pm.expect(x).to.be.a("number");
  pm.expect(s).to.eql([...s].sort((a, b) => b - a));
});
pm.test("Los resultados son ligeros (sin bitácora)", () => pm.expect(cuerpo.datos[0]).to.not.have.property("historial_seguimiento"));`,
    }),
    peticion({
      nombre: "GET /incidencias/buscar?q=filtracion — sin acento (200)",
      descripcion: "El índice en español ignora acentos y usa raíces: mismo resultado.",
      metodo: "GET",
      ruta: "/incidencias/buscar?q=filtracion",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(200)}
pm.test("También encuentra resultados", () => pm.expect(pm.response.json().datos).to.not.be.empty);`,
    }),
    peticion({
      nombre: "GET /incidencias/buscar — q vacío (400)",
      descripcion: "",
      metodo: "GET",
      ruta: "/incidencias/buscar?q=",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(400, "RF-09: 400 Bad Request")}
${t.errorCodigo("VALIDACION")}`,
    }),
    peticion({
      nombre: "GET /incidencias/buscar — sin token (401)",
      descripcion: "",
      metodo: "GET",
      ruta: "/incidencias/buscar?q=switch",
      pruebas: `${t.estado(401)}`,
    }),
  ],
});

carpetas.push({
  name: "8. Analítica (CU-06 · RF-10)",
  description: "Pipeline 1 (eficiencia por edificio) y Pipeline 2 (top 10 de etiquetas).",
  item: [
    peticion({
      nombre: "GET /analitica/edificios — directivo (200)",
      descripcion: "Promedio y total de horas por edificio (`$match`, `$group`, `$sort`).",
      metodo: "GET",
      ruta: "/analitica/edificios",
      token: TOKENS.directivo,
      pruebas: `${t.estado(200, "RF-10: 200 OK")}
pm.test("Cada edificio trae promedio, horas y conteo, ordenado por promedio desc", () => {
  const datos = pm.response.json().datos;
  pm.expect(datos).to.be.an("array").and.not.empty;
  for (const d of datos) pm.expect(d).to.include.keys("edificio", "promedio_horas_resolucion", "total_horas_trabajo", "total_incidencias");
  const p = datos.map((d) => d.promedio_horas_resolucion);
  pm.expect(p).to.eql([...p].sort((a, b) => b - a));
});`,
    }),
    peticion({
      nombre: "GET /analitica/tags — coordinador (200)",
      descripcion: "Ranking de las 10 etiquetas más frecuentes (`$unwind`, `$group`, `$sort`, `$limit`).",
      metodo: "GET",
      ruta: "/analitica/tags",
      token: TOKENS.coordinador,
      pruebas: `${t.estado(200)}
pm.test("Como máximo 10, ordenadas por total desc", () => {
  const datos = pm.response.json().datos;
  pm.expect(datos).to.be.an("array").with.length.within(1, 10);
  for (const d of datos) pm.expect(d).to.include.keys("tag", "total", "edificios");
  const tot = datos.map((d) => d.total);
  pm.expect(tot).to.eql([...tot].sort((a, b) => b - a));
});`,
    }),
    peticion({
      nombre: "GET /analitica/tags — técnico (403)",
      descripcion: "",
      metodo: "GET",
      ruta: "/analitica/tags",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(403)}
${t.errorCodigo("SIN_PERMISO")}`,
    }),
  ],
});

carpetas.push({
  name: "9. Editar y borrar (RF-12)",
  description: "Solo coordinador. El borrado limpia también los archivos del bucket y deja la base como estaba.",
  item: [
    peticion({
      nombre: "PATCH /incidencias/:codigo — técnico (403)",
      descripcion: "",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.tecnico,
      cuerpo: { prioridad: "critica" },
      pruebas: `${t.estado(403)}
${t.errorCodigo("SIN_PERMISO")}`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo — campo no editable (400)",
      descripcion: "La categoría no se puede cambiar.",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.coordinador,
      cuerpo: { categoria: "servicios_academicos" },
      pruebas: `${t.estado(400)}
${t.errorCodigo("VALIDACION")}`,
    }),
    peticion({
      nombre: "PATCH /incidencias/:codigo — coordinador edita (200)",
      descripcion: "`$set` de campos universales.",
      metodo: "PATCH",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.coordinador,
      cuerpo: { titulo: "Prueba Postman: fallo del switch del laboratorio (corregido)", prioridad: "critica" },
      pruebas: `${t.estado(200, "RF-12: 200 OK")}
pm.test("Los campos cambiaron", () => {
  const c = pm.response.json();
  pm.expect(c.titulo).to.include("(corregido)");
  pm.expect(c.prioridad).to.eql("critica");
});`,
    }),
    peticion({
      nombre: "DELETE /incidencias/:codigo — técnico (403)",
      descripcion: "",
      metodo: "DELETE",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.tecnico,
      pruebas: `${t.estado(403)}`,
    }),
    peticion({
      nombre: "DELETE /incidencias/:codigo — coordinador (200)",
      descripcion: "Borra el documento y sus archivos del bucket.",
      metodo: "DELETE",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.coordinador,
      pruebas: `${t.estado(200, "RF-12: 200 OK")}
pm.test("Confirma la eliminación", () => pm.expect(pm.response.json()).to.eql({ eliminada: true, codigo: pm.collectionVariables.get("codigo") }));`,
    }),
    peticion({
      nombre: "GET /incidencias/:codigo — ya no existe (404)",
      descripcion: "Comprueba el borrado.",
      metodo: "GET",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.coordinador,
      pruebas: `${t.estado(404)}
${t.errorCodigo("NO_ENCONTRADO")}`,
    }),
    peticion({
      nombre: "DELETE /incidencias/:codigo — segunda vez (404)",
      descripcion: "",
      metodo: "DELETE",
      ruta: "/incidencias/{{codigo}}",
      token: TOKENS.coordinador,
      pruebas: `${t.estado(404)}`,
    }),
  ],
});

// ---------------------------------------------------------------------------
// Colección y environment
// ---------------------------------------------------------------------------
const coleccion = {
  info: {
    name: "UTM Desk NoSQL Cloud",
    description:
      "Banco de pruebas de la API de UTM Desk. Una carpeta por caso de uso. Requiere los datos del seed " +
      "(`npm run db:seed -- --yes`) y un environment con `base_url` y `password`. " +
      "Ejecución: `npm run test:api` (Newman) o 'Run collection' en Postman, en orden. " +
      "Cubre POST 201, GET 200, PATCH 200, 400 de validación, 401, 403, 404 y la concurrencia del estado (409).",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "codigo", value: "" },
    { key: "estado_paralelo", value: "" },
    ...["tecnico", "coordinador", "directivo", "ana", "daniela"].map((r) => ({ key: `token_${r}`, value: "" })),
  ],
  item: carpetas,
};

const environment = {
  id: "utm-desk-local",
  name: "UTM Desk — local",
  values: [
    { key: "base_url", value: "http://localhost:4000/api", type: "default", enabled: true },
    { key: "correo_tecnico", value: "luis.cauich@utmetropolitana.edu.mx", type: "default", enabled: true },
    { key: "correo_coordinador", value: "roberto.mena@utmetropolitana.edu.mx", type: "default", enabled: true },
    { key: "correo_directivo", value: "laura.cetina@utmetropolitana.edu.mx", type: "default", enabled: true },
    { key: "correo_ana", value: "ana.pech@utmetropolitana.edu.mx", type: "default", enabled: true },
    { key: "correo_daniela", value: "daniela.chan@utmetropolitana.edu.mx", type: "default", enabled: true },
    // La contraseña NO se versiona: se escribe en Postman o la inyecta `npm run test:api`.
    { key: "password", value: "", type: "secret", enabled: true },
  ],
  _postman_variable_scope: "environment",
};

await mkdir(resolve(carpetaPostman, "fixtures"), { recursive: true });
await writeFile(resolve(carpetaPostman, "UTM-Desk.postman_collection.json"), JSON.stringify(coleccion, null, 2) + "\n", "utf8");
await writeFile(resolve(carpetaPostman, "UTM-Desk.local.postman_environment.json"), JSON.stringify(environment, null, 2) + "\n", "utf8");
await writeFile(resolve(carpetaPostman, "fixtures", "evidencia.png"), crearPng(320, 180, [21, 101, 192]));
await writeFile(resolve(carpetaPostman, "fixtures", "no-es-imagen.png"), Buffer.from("Esto es texto plano con extensión .png: no es una imagen.\n"));

const total = carpetas.reduce((n, c) => n + c.item.length, 0);
console.log(`Colección: ${carpetas.length} carpetas, ${total} peticiones → postman/`);
