// Muestra `detalle_especifico` con etiquetas legibles según la categoría (plan §4.2).
// Solo se listan los campos que existen: nunca se rellena con "null" o "—".
const TIPOS_FALLA = { switch: "Switch", access_point: "Access point", servidor: "Servidor", equipo_laboratorio: "Equipo de laboratorio" };
const TIPOS_DANO = { filtracion: "Filtración", luminaria: "Luminaria", climatizacion: "Climatización", cerradura: "Cerradura", otro: "Otro" };
const RIESGOS = { ninguno: "Ninguno", bajo: "Bajo", medio: "Medio", alto: "Alto" };
const PLATAFORMAS = { lms: "LMS", portal_calificaciones: "Portal de calificaciones", correo_institucional: "Correo institucional" };

const traducir = (mapa) => (v) => mapa[v] || v;
const siNo = (v) => (v ? "Sí" : "No");

// Por categoría: [campo, etiqueta, función de formato].
const CAMPOS = {
  computo_redes: [
    ["tipo_falla", "Tipo de falla", traducir(TIPOS_FALLA)],
    ["direccion_ip", "Dirección IP", String],
    ["vlan", "VLAN", String],
    ["puerto_uplink", "Puerto uplink", String],
    ["equipos_afectados", "Equipos afectados", String],
  ],
  infraestructura: [
    ["tipo_dano", "Tipo de daño", traducir(TIPOS_DANO)],
    ["riesgo_seguridad", "Riesgo de seguridad", traducir(RIESGOS)],
    ["requiere_contratista", "Requiere contratista", siNo],
    ["contratista_externo", "Contratista externo", String],
    ["insumos_requeridos", "Insumos requeridos", String], // se muestra como lista
  ],
  academico: [
    ["plataforma", "Plataforma", traducir(PLATAFORMAS)],
    ["periodo_escolar", "Periodo escolar", String],
    ["estudiantes_impactados", "Estudiantes impactados", String],
    ["codigo_curso", "Código de curso", String],
  ],
};

export default function DetalleEspecifico({ categoria, detalle }) {
  const campos = (CAMPOS[categoria] || []).filter(([clave]) => {
    const v = detalle?.[clave];
    // `false` sí es un dato válido (requiere_contratista); null/undefined/"" no.
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== "";
  });
  if (campos.length === 0) return null;

  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {campos.map(([clave, etiqueta, formato]) => {
        const v = detalle[clave];
        return (
          <div key={clave}>
            <dt className="text-sm text-slate-600">{etiqueta}</dt>
            <dd className="font-medium text-slate-900">
              {Array.isArray(v) ? (
                <ul className="list-disc pl-5">
                  {v.map((x, i) => (
                    <li key={`${x}-${i}`} className="break-words">{x}</li>
                  ))}
                </ul>
              ) : (
                <span className="break-words">{formato(v)}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
