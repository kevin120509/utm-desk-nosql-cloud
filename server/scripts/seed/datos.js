// Datos de demostración (RF-14, plan §9): 24 incidencias sintéticas con casos reales de campus.
// Este módulo es PURO: no usa red ni base de datos. Recibe `ahora` y los usuarios y devuelve
// los documentos listos para insertar. Así se puede probar sin tocar Atlas.
import { generarCodigo } from "../../src/domain/index.js";
import { claveAnual, claveDiaria } from "../../src/infrastructure/mongo/contadorMongo.js";

const ZONA = "America/Merida";

/** Personas de demostración. La contraseña de todas sale de SEED_DEFAULT_PASSWORD. */
export const USUARIOS_DEMO = [
  { clave: "ana", nombre: "Mtra. Ana Pech", correo: "ana.pech@utmetropolitana.edu.mx", rol: "reportante", tipo: "docente" },
  { clave: "daniela", nombre: "Daniela Chan", correo: "daniela.chan@utmetropolitana.edu.mx", rol: "reportante", tipo: "estudiante" },
  { clave: "pedro", nombre: "Pedro Canul", correo: "pedro.canul@utmetropolitana.edu.mx", rol: "reportante", tipo: "administrativo" },
  { clave: "tec1", nombre: "Luis Cauich", correo: "luis.cauich@utmetropolitana.edu.mx", rol: "tecnico" },
  { clave: "tec2", nombre: "Marisol Be", correo: "marisol.be@utmetropolitana.edu.mx", rol: "tecnico" },
  { clave: "coo", nombre: "Roberto Mena", correo: "roberto.mena@utmetropolitana.edu.mx", rol: "coordinador" },
  { clave: "dir", nombre: "Dra. Laura Cetina", correo: "laura.cetina@utmetropolitana.edu.mx", rol: "directivo" },
];

// ---------------------------------------------------------------------------
// Tabla de incidencias. `creada` = días atrás; cada paso = [horas después de crear, estado, horas
// de trabajo, comentario, quién]. `ev` = evidencias [muestra, nombre de archivo].
// ---------------------------------------------------------------------------
const I = "infraestructura_fisica";
const R = "computo_redes";
const A = "servicios_academicos";

const TABLA = [
  // ----- INFRAESTRUCTURA -----
  {
    cat: I, titulo: "Filtración en el techo del aula A-203", prioridad: "media", rep: "ana", creada: 32,
    descripcion: "Gotea agua sobre las bancas del fondo cada vez que llueve; el piso queda resbaloso.",
    ubic: ["Edificio A", 2, "A-203"],
    detalle: { tipo_dano: "filtracion", riesgo_seguridad: "medio", requiere_contratista: true,
      contratista_externo: "Impermeabilizaciones del Sureste", insumos_requeridos: ["impermeabilizante acrílico", "sellador de juntas"] },
    tags: ["filtracion", "techo", "recurrente"],
    pasos: [[4, "en proceso", 1.5, "Inspección del techo con el contratista", "tec1"],
      [52, "en espera", 0.5, "Esperando fecha del contratista", "tec1"],
      [120, "en proceso", 2, "El contratista aplicó impermeabilizante", "tec1"],
      [144, "resuelta", 1, "Verificado sin goteo después de la lluvia", "tec1"]],
    ev: [["png-azul", "foto-techo-a203.png"], ["pdf-diagnostico", "diagnostico-filtracion.pdf"]],
  },
  {
    cat: I, titulo: "Vuelve la filtración en el aula A-203", prioridad: "alta", rep: "ana", creada: 25,
    descripcion: "La gotera reapareció en la misma esquina del techo, ahora con manchas de humedad en el muro.",
    ubic: ["Edificio A", 2, "A-203"],
    detalle: { tipo_dano: "filtracion", riesgo_seguridad: "medio", requiere_contratista: true,
      contratista_externo: "Impermeabilizaciones del Sureste", insumos_requeridos: ["sellador de juntas"] },
    tags: ["filtracion", "techo", "recurrente", "urgente"],
    pasos: [[2, "en proceso", 1, "Se revisó la junta de la azotea", "tec2"],
      [30, "resuelta", 3, "Se selló la junta y se secó el muro", "tec2"],
      [50, "cerrada", 0, "Cierre administrativo", "coo"]],
    ev: [["png-naranja", "humedad-muro-a203.png"]],
  },
  {
    cat: I, titulo: "Nueva filtración en el aula A-203 tras la tormenta", prioridad: "critica", rep: "ana", creada: 2,
    descripcion: "Escurre agua junto a una luminaria; se suspendieron las clases del aula por seguridad.",
    ubic: ["Edificio A", 2, "A-203"],
    detalle: { tipo_dano: "filtracion", riesgo_seguridad: "alto", requiere_contratista: true,
      contratista_externo: "Impermeabilizaciones del Sureste", insumos_requeridos: ["impermeabilizante acrílico", "luminaria LED de repuesto"] },
    tags: ["filtracion", "techo", "recurrente", "urgente"],
    pasos: [[3, "en proceso", 2, "Se cortó la energía del circuito y se colocó cubeta", "tec1"]],
    ev: [["png-verde", "luminaria-mojada.png"]],
  },
  {
    cat: I, titulo: "Luminaria fundida en el pasillo de la Biblioteca", prioridad: "baja", rep: "pedro", creada: 3,
    descripcion: "El tubo LED del pasillo central no enciende y la zona queda oscura por las tardes.",
    ubic: ["Biblioteca", 1, "Pasillo central"],
    detalle: { tipo_dano: "luminaria", riesgo_seguridad: "bajo", requiere_contratista: false, insumos_requeridos: ["tubo LED 18W"] },
    tags: ["luminaria", "biblioteca"],
    pasos: [], ev: [],
  },
  {
    cat: I, titulo: "Aire acondicionado sin enfriar en la sala de juntas", prioridad: "media", rep: "pedro", creada: 9,
    descripcion: "El equipo prende pero no enfría; la sala llega a más de 30 grados en las reuniones.",
    ubic: ["Administrativo", 2, "Sala de juntas"],
    detalle: { tipo_dano: "climatizacion", riesgo_seguridad: "ninguno", requiere_contratista: true,
      contratista_externo: "Clima Total Mérida", insumos_requeridos: ["gas refrigerante R410A"] },
    tags: ["climatizacion", "sin-refaccion"],
    pasos: [[5, "en proceso", 1, "Diagnóstico: fuga de refrigerante", "tec2"],
      [30, "en espera", 0.5, "Esperando la refacción del proveedor", "tec2"]],
    ev: [["png-azul", "unidad-exterior.png"]],
  },
  {
    cat: I, titulo: "Cerradura dañada en la puerta del laboratorio LC-1", prioridad: "media", rep: "ana", creada: 14,
    descripcion: "La puerta no asegura y el laboratorio queda abierto fuera de horario.",
    ubic: ["Laboratorios de Cómputo", 1, "LC-1"],
    detalle: { tipo_dano: "cerradura", riesgo_seguridad: "medio", requiere_contratista: false, insumos_requeridos: ["cerradura de embutir"] },
    tags: ["cerradura", "seguridad"],
    pasos: [[6, "en proceso", 1, "Se retiró la cerradura dañada", "tec1"],
      [22, "resuelta", 1.5, "Cerradura nueva instalada y probada", "tec1"]],
    ev: [["png-naranja", "cerradura-lc1.png"]],
  },
  {
    cat: I, titulo: "Luminarias del aula B-101 parpadean", prioridad: "baja", rep: "daniela", creada: 30,
    descripcion: "Dos luminarias parpadean durante la clase y provocan dolor de cabeza.",
    ubic: ["Edificio B", 1, "B-101"],
    detalle: { tipo_dano: "luminaria", riesgo_seguridad: "bajo", requiere_contratista: false },
    tags: ["luminaria"],
    pasos: [[8, "en proceso", 0.5, "Se detectó balastro en mal estado", "tec2"],
      [26, "resuelta", 1, "Balastros reemplazados", "tec2"],
      [40, "cerrada", 0, "Cierre administrativo", "coo"]],
    ev: [["png-verde", "luminarias-b101.png"]],
  },
  {
    cat: I, titulo: "La puerta del aula B-204 no cierra", prioridad: "alta", rep: "daniela", creada: 1,
    descripcion: "La puerta quedó desalineada y no cierra; el aula no se puede asegurar al terminar el día.",
    ubic: ["Edificio B", 2, "B-204"],
    detalle: { tipo_dano: "otro", riesgo_seguridad: "bajo", requiere_contratista: false },
    tags: ["puerta", "seguridad"],
    pasos: [], ev: [],
  },
  // ----- CÓMPUTO Y REDES -----
  {
    cat: R, titulo: "Switch del laboratorio LC-2 sin respuesta", prioridad: "alta", rep: "ana", creada: 31,
    descripcion: "Desde las 8:00 los equipos del laboratorio no obtienen red ni acceso a internet.",
    ubic: ["Laboratorios de Cómputo", 1, "LC-2"],
    detalle: { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 28 },
    tags: ["switch", "sin-red", "laboratorio", "recurrente"],
    pasos: [[1, "en proceso", 1.5, "Revisando el enlace del uplink", "tec1"],
      [5, "resuelta", 2, "Se reemplazó el módulo SFP del uplink", "tec1"]],
    ev: [["png-azul", "switch-lc2.png"]],
  },
  {
    cat: R, titulo: "El switch del LC-2 vuelve a fallar", prioridad: "alta", rep: "ana", creada: 20,
    descripcion: "Otra vez sin red en el laboratorio LC-2; el problema aparece cada par de semanas.",
    ubic: ["Laboratorios de Cómputo", 1, "LC-2"],
    detalle: { tipo_falla: "switch", direccion_ip: "10.20.2.1", vlan: 20, puerto_uplink: "Gi1/0/24", equipos_afectados: 26 },
    tags: ["switch", "laboratorio", "recurrente"],
    pasos: [[2, "en proceso", 1, "Se detectó sobrecalentamiento del equipo", "tec2"],
      [10, "resuelta", 2.5, "Se agregó ventilación al gabinete", "tec2"],
      [30, "cerrada", 0, "Cierre administrativo", "coo"]],
    ev: [["png-naranja", "gabinete-lc2.png"]],
  },
  {
    cat: R, titulo: "Access point del LC-2 desconectado", prioridad: "media", rep: "ana", creada: 5,
    descripcion: "El punto de acceso Wi-Fi del laboratorio no aparece en la red y los alumnos no se conectan.",
    ubic: ["Laboratorios de Cómputo", 1, "LC-2"],
    detalle: { tipo_falla: "access_point", direccion_ip: "10.20.2.15", vlan: 20, puerto_uplink: "Gi1/0/12", equipos_afectados: 12 },
    tags: ["access-point", "wifi", "laboratorio", "recurrente"],
    pasos: [[4, "en proceso", 1, "Revisando alimentación PoE del puerto", "tec1"]],
    ev: [["png-verde", "ap-lc2.png"]],
  },
  {
    cat: R, titulo: "Servidor de archivos local caído", prioridad: "critica", rep: "pedro", creada: 18,
    descripcion: "No se puede abrir ninguna carpeta compartida del área administrativa desde las 7:30.",
    ubic: ["Administrativo", 1, "Cuarto de servidores"],
    detalle: { tipo_falla: "servidor", direccion_ip: "10.20.1.10", vlan: 10, puerto_uplink: "Gi1/0/1", equipos_afectados: 45 },
    tags: ["servidor", "urgente"],
    pasos: [[1, "en proceso", 3, "Disco del arreglo RAID degradado", "tec1"],
      [9, "resuelta", 6, "Disco reemplazado y arreglo reconstruido", "coo"]],
    ev: [["png-azul", "raid-degradado.png"], ["pdf-diagnostico", "informe-servidor.pdf"]],
  },
  {
    cat: R, titulo: "Wi-Fi intermitente en la Biblioteca", prioridad: "media", rep: "daniela", creada: 12,
    descripcion: "La señal se cae cada pocos minutos en la sala de lectura y no se pueden consultar bases de datos.",
    ubic: ["Biblioteca", 1, "Sala de lectura"],
    detalle: { tipo_falla: "access_point", direccion_ip: "10.20.4.21", vlan: 40, puerto_uplink: "Gi1/0/8", equipos_afectados: 30 },
    tags: ["wifi", "access-point", "biblioteca"],
    pasos: [[6, "en proceso", 1, "Medición de interferencia con otros equipos", "tec2"],
      [48, "en espera", 0.5, "Esperando ventana de mantenimiento", "tec2"]],
    ev: [["png-naranja", "mapa-senal-biblioteca.png"]],
  },
  {
    cat: R, titulo: "Equipo del laboratorio LC-3 no enciende", prioridad: "baja", rep: "ana", creada: 4,
    descripcion: "La computadora de la estación 12 no enciende aunque el cable de corriente está conectado.",
    ubic: ["Laboratorios de Cómputo", 1, "LC-3"],
    detalle: { tipo_falla: "equipo_laboratorio", direccion_ip: "10.20.3.33", vlan: 30, puerto_uplink: "Gi1/0/5", equipos_afectados: 1 },
    tags: ["equipo-laboratorio"],
    pasos: [], ev: [],
  },
  {
    cat: R, titulo: "Sin red en la planta alta del Edificio B", prioridad: "media", rep: "daniela", creada: 28,
    descripcion: "Las aulas de la planta alta no tienen red cableada ni Wi-Fi desde la mañana.",
    ubic: ["Edificio B", 2, "Gabinete de comunicaciones"],
    detalle: { tipo_falla: "switch", direccion_ip: "10.20.5.1", vlan: 50, puerto_uplink: "Gi1/0/24", equipos_afectados: 18 },
    tags: ["switch", "sin-red"],
    pasos: [[3, "en proceso", 2, "Se localizó un cable de fibra dañado", "tec1"],
      [14, "resuelta", 3, "Se tendió fibra nueva", "tec1"],
      [36, "cerrada", 0, "Cierre administrativo", "coo"]],
    ev: [["png-verde", "fibra-danada.png"]],
  },
  {
    cat: R, titulo: "Access point del Edificio A sin señal", prioridad: "alta", rep: "pedro", creada: 7,
    descripcion: "El pasillo y las aulas del primer piso del Edificio A no tienen cobertura Wi-Fi.",
    ubic: ["Edificio A", 1, "Pasillo"],
    detalle: { tipo_falla: "access_point", direccion_ip: "10.20.6.14", vlan: 60, puerto_uplink: "Gi1/0/3", equipos_afectados: 40 },
    tags: ["wifi", "access-point"],
    pasos: [[3, "en proceso", 1.5, "Reinicio de controlador sin éxito, se prueba otro AP", "tec2"]],
    ev: [["png-azul", "controlador-wifi.png"]],
  },
  // ----- SISTEMAS ACADÉMICOS -----
  {
    cat: A, titulo: "Cuentas de correo institucional bloqueadas (periodo 2026-2)", prioridad: "alta", rep: "pedro", creada: 31,
    descripcion: "Decenas de estudiantes no pueden iniciar sesión en su correo institucional desde el lunes.",
    ubic: ["Administrativo", 1, "Coordinación TIC"],
    detalle: { plataforma: "correo_institucional", periodo_escolar: "2026-2", estudiantes_impactados: 85 },
    tags: ["correo", "acceso", "recurrente"],
    pasos: [[2, "en proceso", 1, "Se identificó política de bloqueo por intentos fallidos", "tec2"],
      [20, "resuelta", 2, "Cuentas desbloqueadas y política ajustada", "tec2"]],
    ev: [["png-naranja", "bloqueos-correo.png"]],
  },
  {
    cat: A, titulo: "Cuentas de correo institucional bloqueadas (periodo 2026-3)", prioridad: "alta", rep: "daniela", creada: 6,
    descripcion: "Al inicio del periodo se bloquearon otra vez las cuentas de nuevo ingreso.",
    ubic: ["Administrativo", 1, "Coordinación TIC"],
    detalle: { plataforma: "correo_institucional", periodo_escolar: "2026-3", estudiantes_impactados: 120 },
    tags: ["correo", "acceso", "recurrente", "urgente"],
    pasos: [[3, "en proceso", 1.5, "Revisando importación masiva de cuentas", "tec1"]],
    ev: [["png-azul", "alta-masiva.png"]],
  },
  {
    cat: A, titulo: "No carga el aula virtual en Matemáticas", prioridad: "media", rep: "ana", creada: 22,
    descripcion: "El curso de Matemáticas muestra pantalla en blanco al abrir las actividades.",
    ubic: ["Edificio B", 1, "B-102"],
    detalle: { plataforma: "lms", periodo_escolar: "2026-3", estudiantes_impactados: 38, codigo_curso: "MAT-301" },
    tags: ["lms", "aula-virtual"],
    pasos: [[3, "en proceso", 1, "Curso con caché dañada", "tec1"],
      [25, "resuelta", 1.5, "Caché reconstruida", "tec1"],
      [45, "cerrada", 0, "Cierre administrativo", "coo"]],
    ev: [["png-verde", "pantalla-en-blanco.png"]],
  },
  {
    cat: A, titulo: "Error al asentar actas en el portal de calificaciones", prioridad: "critica", rep: "ana", creada: 30,
    descripcion: "El portal marca error 500 al guardar calificaciones y el cierre de actas vence hoy.",
    ubic: ["Edificio A", 1, "Sala de profesores"],
    detalle: { plataforma: "portal_calificaciones", periodo_escolar: "2026-2", estudiantes_impactados: 210, codigo_curso: "PRG-210" },
    tags: ["portal", "calificaciones", "urgente"],
    pasos: [[1, "en proceso", 2, "Error por tabla de bitácora llena", "tec2"],
      [7, "resuelta", 4, "Se depuró la tabla y se reanudó el servicio", "tec2"]],
    ev: [["png-naranja", "error-500.png"], ["pdf-diagnostico", "reporte-incidente-portal.pdf"]],
  },
  {
    cat: A, titulo: "El aula virtual no muestra las tareas de Bases de Datos", prioridad: "media", rep: "daniela", creada: 2,
    descripcion: "Los alumnos no ven las tareas de la semana en el curso de Bases de Datos.",
    ubic: ["Edificio B", 2, "B-205"],
    detalle: { plataforma: "lms", periodo_escolar: "2026-3", estudiantes_impactados: 27, codigo_curso: "BDN-305" },
    tags: ["lms", "aula-virtual"],
    pasos: [], ev: [],
  },
  {
    cat: A, titulo: "Portal de calificaciones muy lento en horas pico", prioridad: "baja", rep: "pedro", creada: 15,
    descripcion: "Entre las 10 y las 12 el portal tarda más de un minuto en responder.",
    ubic: ["Administrativo", 1, "Control escolar"],
    detalle: { plataforma: "portal_calificaciones", periodo_escolar: "2026-3", estudiantes_impactados: 300 },
    tags: ["portal", "rendimiento"],
    pasos: [[5, "en proceso", 1, "Medición de consultas lentas", "tec1"],
      [60, "en espera", 0.5, "Pendiente de ampliar recursos del servidor", "tec1"]],
    ev: [["png-azul", "tiempos-respuesta.png"]],
  },
  {
    cat: A, titulo: "El correo institucional no recibe mensajes externos", prioridad: "media", rep: "ana", creada: 27,
    descripcion: "No llegan correos de dominios externos a las cuentas del personal docente.",
    ubic: ["Edificio A", 1, "Sala de profesores"],
    detalle: { plataforma: "correo_institucional", periodo_escolar: "2026-2", estudiantes_impactados: 60 },
    tags: ["correo"],
    pasos: [[4, "en proceso", 1, "Registros MX con valor antiguo", "tec2"],
      [18, "resuelta", 1, "Registros DNS corregidos", "tec2"],
      [40, "cerrada", 0, "Cierre administrativo", "coo"]],
    ev: [],
  },
  {
    cat: A, titulo: "Los videos del aula virtual no se reproducen", prioridad: "baja", rep: "daniela", creada: 1,
    descripcion: "Los videos de las clases muestran un círculo de carga y nunca inician.",
    ubic: ["Biblioteca", 1, "Sala de cómputo"],
    detalle: { plataforma: "lms", periodo_escolar: "2026-3", estudiantes_impactados: 45, codigo_curso: "SIS-110" },
    tags: ["lms", "video"],
    pasos: [], ev: [],
  },
];

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------
const MS_HORA = 3_600_000;
const MS_DIA = 24 * MS_HORA;

function anioEnMerida(fecha) {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric" }).format(fecha));
}

/**
 * Construye los documentos de incidencias.
 * @param {{ahora: Date, usuarios: Record<string, {_id: *, nombre: string, correo: string, rol: string, tipo?: string}>}} datos
 *   `usuarios` indexado por la `clave` de USUARIOS_DEMO (con su `_id` ya asignado).
 * @returns {{incidencias: object[], planEvidencias: Map<string, Array<[string, string]>>,
 *            contadores: Array<{_id: string, valor: number}>}}
 */
export function construirDatos({ ahora, usuarios }) {
  const anio = anioEnMerida(ahora);

  // 1. Documentos base, en orden cronológico (los códigos siguen la fecha de creación).
  const base = TABLA.map((t, indice) => {
    const creacion = new Date(ahora.getTime() - t.creada * MS_DIA - (indice % 7) * MS_HORA);
    const reportante = usuarios[t.rep];
    const historial = [
      {
        fecha: creacion,
        autor: { usuario_id: reportante._id, nombre: reportante.nombre },
        estado_nuevo: "abierta",
        comentario: "Incidencia registrada",
        horas: 0,
      },
    ];
    let estado = "abierta";
    let horasTotales = 0;
    let asignado;
    let fechaResolucion;
    for (const [despues, nuevo, horas, comentario, quien] of t.pasos) {
      const actor = usuarios[quien];
      const fecha = new Date(creacion.getTime() + despues * MS_HORA);
      historial.push({
        fecha,
        autor: { usuario_id: actor._id, nombre: actor.nombre },
        estado_anterior: estado,
        estado_nuevo: nuevo,
        comentario,
        horas,
      });
      if (actor.rol === "tecnico" && !asignado) asignado = { usuario_id: actor._id, nombre: actor.nombre };
      if (nuevo === "resuelta" && !fechaResolucion) fechaResolucion = fecha; // cerrar conserva la que ya había
      horasTotales += horas;
      estado = nuevo;
    }

    const doc = {
      titulo: t.titulo,
      descripcion: t.descripcion,
      categoria: t.cat,
      prioridad: t.prioridad,
      estado,
      reportante: { usuario_id: reportante._id, nombre: reportante.nombre, tipo: reportante.tipo, correo: reportante.correo },
      ubicacion: { edificio: t.ubic[0], piso: t.ubic[1], espacio: t.ubic[2] },
      detalle_especifico: t.detalle,
      tags: t.tags,
      historial_seguimiento: historial,
      evidencias_adjuntas: [], // se llenan al subir los archivos (o con datos falsos en pruebas)
      horas_invertidas: horasTotales,
      fecha_creacion: creacion,
      fecha_actualizacion: historial[historial.length - 1].fecha,
      _evidencias: t.ev,
    };
    if (asignado) doc.asignado_a = asignado;
    if (fechaResolucion) doc.fecha_resolucion = fechaResolucion;
    return doc;
  }).sort((a, b) => a.fecha_creacion - b.fecha_creacion);

  // 2. Códigos anuales y consecutivos diarios por (día, categoría).
  const porDia = new Map();
  const incidencias = base.map((doc, i) => {
    const claveDia = claveDiaria(doc.categoria, doc.fecha_creacion);
    const consecutivo = (porDia.get(claveDia) ?? 0) + 1;
    porDia.set(claveDia, consecutivo);
    const { _evidencias, ...resto } = doc;
    return { doc: { codigo: generarCodigo(anio, i + 1), consecutivo_diario: consecutivo, ...resto }, ev: _evidencias };
  });

  const planEvidencias = new Map(incidencias.filter((x) => x.ev.length).map((x) => [x.doc.codigo, x.ev]));
  // 3. Contadores para que las altas reales continúen sin chocar con el seed.
  const contadores = [
    { _id: claveAnual(anio), valor: incidencias.length },
    ...[...porDia.entries()].map(([_id, valor]) => ({ _id, valor })),
  ];

  return { incidencias: incidencias.map((x) => x.doc), planEvidencias, contadores };
}

/** Evidencias de mentira (sin subir nada): para pruebas y `--dry-run`. */
export function evidenciasFalsas(incidencias, planEvidencias, muestras) {
  for (const doc of incidencias) {
    const plan = planEvidencias.get(doc.codigo) ?? [];
    doc.evidencias_adjuntas = plan.map(([muestra, nombre], n) => {
      const fecha = new Date(doc.fecha_creacion.getTime() + (n + 1) * 30 * 60_000);
      return {
        nombre_archivo: nombre,
        tipo_mime: muestras[muestra].tipoMime,
        peso_kb: Math.max(0.01, Math.round((muestras[muestra].buffer.length / 1024) * 100) / 100),
        storage_path: `${doc.codigo}/demo-${n}-${nombre}`,
        url_storage: "https://ejemplo.invalid/evidencia",
        url_expira: new Date(fecha.getTime() + MS_HORA),
        fecha_carga: fecha,
      };
    });
  }
  return incidencias;
}
