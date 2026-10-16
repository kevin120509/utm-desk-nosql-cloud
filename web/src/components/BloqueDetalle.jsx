// Bloque dinámico de `detalle_especifico` según la categoría (plan §4.2).
// Es el reflejo en la UI del polimorfismo del documento.
import { useState } from "react";
import Campo, { claseControl } from "./Campo.jsx";

const TIPOS_FALLA = { switch: "Switch", access_point: "Access point", servidor: "Servidor", equipo_laboratorio: "Equipo de laboratorio" };
const TIPOS_DANO = { filtracion: "Filtración", luminaria: "Luminaria", climatizacion: "Climatización", cerradura: "Cerradura", otro: "Otro" };
const RIESGOS = { ninguno: "Ninguno", bajo: "Bajo", medio: "Medio", alto: "Alto" };
const PLATAFORMAS = { lms: "LMS", portal_calificaciones: "Portal de calificaciones", correo_institucional: "Correo institucional" };

const REGEX_IPV4 = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const REGEX_PERIODO = /^\d{4}-[1-3]$/;

// Estado inicial vacío de cada categoría.
export function detalleInicial(categoria) {
  if (categoria === "computo_redes")
    return { tipo_falla: "", direccion_ip: "", vlan: "", puerto_uplink: "", equipos_afectados: "" };
  if (categoria === "infraestructura")
    return { tipo_dano: "", riesgo_seguridad: "", requiere_contratista: false, contratista_externo: "", insumos_requeridos: [] };
  if (categoria === "academico")
    return { plataforma: "", periodo_escolar: "", estudiantes_impactados: "", codigo_curso: "" };
  return {};
}

const esEnteroMin = (v, min) => /^-?\d+$/.test(String(v).trim()) && Number(v) >= min;

// Valida el detalle en cliente. Devuelve { "detalle_especifico.campo": mensaje }.
export function validarDetalle(categoria, d) {
  const e = {};
  const p = (c) => `detalle_especifico.${c}`;
  const vacio = (v) => !String(v ?? "").trim();
  if (categoria === "computo_redes") {
    if (!d.tipo_falla) e[p("tipo_falla")] = "Selecciona el tipo de falla.";
    if (vacio(d.direccion_ip)) e[p("direccion_ip")] = "La dirección IP es obligatoria.";
    else if (!REGEX_IPV4.test(d.direccion_ip.trim())) e[p("direccion_ip")] = "Escribe una IPv4 válida, por ejemplo 10.0.12.5.";
    if (vacio(d.vlan)) e[p("vlan")] = "La VLAN es obligatoria.";
    else if (!esEnteroMin(d.vlan, 1) || Number(d.vlan) > 4094) e[p("vlan")] = "La VLAN debe ser un entero entre 1 y 4094.";
    if (vacio(d.puerto_uplink)) e[p("puerto_uplink")] = "El puerto uplink es obligatorio.";
    if (vacio(d.equipos_afectados)) e[p("equipos_afectados")] = "Indica los equipos afectados.";
    else if (!esEnteroMin(d.equipos_afectados, 1)) e[p("equipos_afectados")] = "Debe ser un entero de al menos 1.";
  } else if (categoria === "infraestructura") {
    if (!d.tipo_dano) e[p("tipo_dano")] = "Selecciona el tipo de daño.";
    if (!d.riesgo_seguridad) e[p("riesgo_seguridad")] = "Selecciona el riesgo de seguridad.";
    if (d.requiere_contratista && vacio(d.contratista_externo)) e[p("contratista_externo")] = "Indica el contratista externo.";
  } else if (categoria === "academico") {
    if (!d.plataforma) e[p("plataforma")] = "Selecciona la plataforma.";
    if (vacio(d.periodo_escolar)) e[p("periodo_escolar")] = "El periodo escolar es obligatorio.";
    else if (!REGEX_PERIODO.test(d.periodo_escolar.trim())) e[p("periodo_escolar")] = "Usa el formato AAAA-1, AAAA-2 o AAAA-3.";
    if (vacio(d.estudiantes_impactados)) e[p("estudiantes_impactados")] = "Indica los estudiantes impactados.";
    else if (!esEnteroMin(d.estudiantes_impactados, 1)) e[p("estudiantes_impactados")] = "Debe ser un entero de al menos 1.";
  }
  return e;
}

// Arma el objeto a enviar: sin vacíos, sin null y sin campos que no aplican.
export function construirDetalle(categoria, d) {
  const t = (v) => String(v).trim();
  if (categoria === "computo_redes")
    return {
      tipo_falla: d.tipo_falla,
      direccion_ip: t(d.direccion_ip),
      vlan: Number(d.vlan),
      puerto_uplink: t(d.puerto_uplink),
      equipos_afectados: Number(d.equipos_afectados),
    };
  if (categoria === "infraestructura") {
    const o = { tipo_dano: d.tipo_dano, riesgo_seguridad: d.riesgo_seguridad, requiere_contratista: !!d.requiere_contratista };
    if (d.requiere_contratista && t(d.contratista_externo)) o.contratista_externo = t(d.contratista_externo);
    const insumos = d.insumos_requeridos.map(t).filter(Boolean);
    if (insumos.length > 0) o.insumos_requeridos = insumos;
    return o;
  }
  const o = { plataforma: d.plataforma, periodo_escolar: t(d.periodo_escolar), estudiantes_impactados: Number(d.estudiantes_impactados) };
  if (d.plataforma !== "correo_institucional" && t(d.codigo_curso)) o.codigo_curso = t(d.codigo_curso);
  return o;
}

function Select({ props, opciones, valor, onChange }) {
  return (
    <select {...props} value={valor} onChange={onChange}>
      <option value="">Selecciona…</option>
      {Object.entries(opciones).map(([v, et]) => (
        <option key={v} value={v}>{et}</option>
      ))}
    </select>
  );
}

// Props: categoria, valor (estado del bloque), onCambio(campo, valor), errores.
export default function BloqueDetalle({ categoria, valor, onCambio, errores }) {
  const [nuevoInsumo, setNuevoInsumo] = useState("");
  const err = (c) => errores[`detalle_especifico.${c}`];
  const id = (c) => `detalle-${c}`;
  const set = (c) => (ev) => onCambio(c, ev.target.value);

  if (categoria === "computo_redes")
    return (
      <>
        <Campo id={id("tipo_falla")} etiqueta="Tipo de falla" requerido error={err("tipo_falla")}>
          {(p) => <Select props={p} opciones={TIPOS_FALLA} valor={valor.tipo_falla} onChange={set("tipo_falla")} />}
        </Campo>
        <Campo id={id("direccion_ip")} etiqueta="Dirección IP" requerido error={err("direccion_ip")} ayuda="Formato IPv4, por ejemplo 10.0.12.5">
          {(p) => <input {...p} type="text" inputMode="decimal" autoComplete="off" value={valor.direccion_ip} onChange={set("direccion_ip")} />}
        </Campo>
        <Campo id={id("vlan")} etiqueta="VLAN" requerido error={err("vlan")} ayuda="Entero de 1 a 4094">
          {(p) => <input {...p} type="number" inputMode="numeric" min={1} max={4094} value={valor.vlan} onChange={set("vlan")} />}
        </Campo>
        <Campo id={id("puerto_uplink")} etiqueta="Puerto uplink" requerido error={err("puerto_uplink")}>
          {(p) => <input {...p} type="text" value={valor.puerto_uplink} onChange={set("puerto_uplink")} />}
        </Campo>
        <Campo id={id("equipos_afectados")} etiqueta="Equipos afectados" requerido error={err("equipos_afectados")}>
          {(p) => <input {...p} type="number" inputMode="numeric" min={1} value={valor.equipos_afectados} onChange={set("equipos_afectados")} />}
        </Campo>
      </>
    );

  if (categoria === "infraestructura") {
    const agregar = () => {
      const t = nuevoInsumo.trim();
      if (!t) return;
      onCambio("insumos_requeridos", [...valor.insumos_requeridos, t]);
      setNuevoInsumo("");
    };
    return (
      <>
        <Campo id={id("tipo_dano")} etiqueta="Tipo de daño" requerido error={err("tipo_dano")}>
          {(p) => <Select props={p} opciones={TIPOS_DANO} valor={valor.tipo_dano} onChange={set("tipo_dano")} />}
        </Campo>
        <Campo id={id("riesgo_seguridad")} etiqueta="Riesgo de seguridad" requerido error={err("riesgo_seguridad")}>
          {(p) => <Select props={p} opciones={RIESGOS} valor={valor.riesgo_seguridad} onChange={set("riesgo_seguridad")} />}
        </Campo>
        <div className="flex items-center gap-2">
          <input
            id={id("requiere_contratista")}
            type="checkbox"
            checked={valor.requiere_contratista}
            onChange={(ev) => onCambio("requiere_contratista", ev.target.checked)}
            className="h-4 w-4 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          />
          <label htmlFor={id("requiere_contratista")} className="text-sm font-medium text-slate-800">
            Requiere contratista
          </label>
        </div>
        {valor.requiere_contratista && (
          <Campo id={id("contratista_externo")} etiqueta="Contratista externo" requerido error={err("contratista_externo")}>
            {(p) => <input {...p} type="text" value={valor.contratista_externo} onChange={set("contratista_externo")} />}
          </Campo>
        )}
        <div>
          <label htmlFor={id("insumo_nuevo")} className="block text-sm font-medium text-slate-800">
            Insumos requeridos <span className="font-normal text-slate-600">(opcional)</span>
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={id("insumo_nuevo")}
              type="text"
              value={nuevoInsumo}
              onChange={(ev) => setNuevoInsumo(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  ev.preventDefault();
                  agregar();
                }
              }}
              className={claseControl.replace("mt-1 ", "")}
            />
            <button
              type="button"
              onClick={agregar}
              className="shrink-0 rounded-md border border-emerald-800 px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Agregar
            </button>
          </div>
          {valor.insumos_requeridos.length > 0 && (
            <ul className="mt-2 space-y-1">
              {valor.insumos_requeridos.map((ins, i) => (
                <li key={`${ins}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-900">
                  <span className="break-words">{ins}</span>
                  <button
                    type="button"
                    onClick={() => onCambio("insumos_requeridos", valor.insumos_requeridos.filter((_, j) => j !== i))}
                    aria-label={`Quitar insumo ${ins}`}
                    className="rounded px-2 text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-800"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  if (categoria === "academico")
    return (
      <>
        <Campo id={id("plataforma")} etiqueta="Plataforma" requerido error={err("plataforma")}>
          {(p) => <Select props={p} opciones={PLATAFORMAS} valor={valor.plataforma} onChange={set("plataforma")} />}
        </Campo>
        <Campo id={id("periodo_escolar")} etiqueta="Periodo escolar" requerido error={err("periodo_escolar")} ayuda="Formato AAAA-1, AAAA-2 o AAAA-3, por ejemplo 2026-1">
          {(p) => <input {...p} type="text" autoComplete="off" value={valor.periodo_escolar} onChange={set("periodo_escolar")} />}
        </Campo>
        <Campo id={id("estudiantes_impactados")} etiqueta="Estudiantes impactados" requerido error={err("estudiantes_impactados")}>
          {(p) => <input {...p} type="number" inputMode="numeric" min={1} value={valor.estudiantes_impactados} onChange={set("estudiantes_impactados")} />}
        </Campo>
        {(valor.plataforma === "lms" || valor.plataforma === "portal_calificaciones") && (
          <Campo id={id("codigo_curso")} etiqueta="Código de curso" error={err("codigo_curso")}>
            {(p) => <input {...p} type="text" value={valor.codigo_curso} onChange={set("codigo_curso")} />}
          </Campo>
        )}
      </>
    );

  return null;
}
