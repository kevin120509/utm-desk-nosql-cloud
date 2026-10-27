// Pruebas de los esquemas Zod del dominio (escritas antes de implementar).
import { describe, it, expect } from 'vitest';
import {
  detalleComputoRedes,
  detalleInfraestructura,
  detalleAcademico,
  crearIncidenciaSchema,
  cambiarEstadoSchema,
  etiquetaSchema,
  editarIncidenciaSchema,
} from '../../src/domain/index.js';

const ok = (esquema, dato) => esquema.safeParse(dato).success;

const redes = { tipo_falla: 'switch', direccion_ip: '10.20.2.1', vlan: 20, puerto_uplink: 'Gi1/0/24', equipos_afectados: 28 };
const infra = { tipo_dano: 'filtracion', riesgo_seguridad: 'bajo', requiere_contratista: false };
const acad = { plataforma: 'lms', periodo_escolar: '2026-3', estudiantes_impactados: 30 };

describe('detalleComputoRedes', () => {
  it('acepta un detalle válido', () => expect(ok(detalleComputoRedes, redes)).toBe(true));
  it('rechaza campo faltante', () => {
    const { vlan, ...sin } = redes;
    expect(ok(detalleComputoRedes, sin)).toBe(false);
  });
  it('rechaza enum malo', () => expect(ok(detalleComputoRedes, { ...redes, tipo_falla: 'router' })).toBe(false));
  it('rechaza IP 999.1.1.1', () => expect(ok(detalleComputoRedes, { ...redes, direccion_ip: '999.1.1.1' })).toBe(false));
  it('rechaza IP con formato raro', () => expect(ok(detalleComputoRedes, { ...redes, direccion_ip: '10.1.1' })).toBe(false));
  it('rechaza vlan 5000 y 0', () => {
    expect(ok(detalleComputoRedes, { ...redes, vlan: 5000 })).toBe(false);
    expect(ok(detalleComputoRedes, { ...redes, vlan: 0 })).toBe(false);
  });
  it('rechaza equipos_afectados 0', () => expect(ok(detalleComputoRedes, { ...redes, equipos_afectados: 0 })).toBe(false));
  it('rechaza puerto vacío', () => expect(ok(detalleComputoRedes, { ...redes, puerto_uplink: '' })).toBe(false));
  it('rechaza campos extra', () => expect(ok(detalleComputoRedes, { ...redes, extra: 1 })).toBe(false));
});

describe('detalleInfraestructura', () => {
  it('acepta mínimo válido', () => expect(ok(detalleInfraestructura, infra)).toBe(true));
  it('acepta con contratista y insumos', () => {
    expect(ok(detalleInfraestructura, { ...infra, requiere_contratista: true, contratista_externo: 'ACME', insumos_requeridos: ['cable'] })).toBe(true);
  });
  it('rechaza campo faltante', () => {
    const { tipo_dano, ...sin } = infra;
    expect(ok(detalleInfraestructura, sin)).toBe(false);
  });
  it('rechaza enum malo', () => expect(ok(detalleInfraestructura, { ...infra, riesgo_seguridad: 'extremo' })).toBe(false));
  it('rechaza contratista_externo con requiere_contratista false', () => {
    expect(ok(detalleInfraestructura, { ...infra, contratista_externo: 'ACME' })).toBe(false);
  });
  it('rechaza insumos vacío', () => expect(ok(detalleInfraestructura, { ...infra, insumos_requeridos: [] })).toBe(false));
  it('rechaza extra', () => expect(ok(detalleInfraestructura, { ...infra, otro: 1 })).toBe(false));
});

describe('detalleAcademico', () => {
  it('acepta válido', () => expect(ok(detalleAcademico, acad)).toBe(true));
  it('acepta codigo_curso con lms', () => expect(ok(detalleAcademico, { ...acad, codigo_curso: 'BD-101' })).toBe(true));
  it('rechaza codigo_curso con correo_institucional', () => {
    expect(ok(detalleAcademico, { ...acad, plataforma: 'correo_institucional', codigo_curso: 'BD-101' })).toBe(false);
  });
  it('rechaza periodo mal formado', () => {
    expect(ok(detalleAcademico, { ...acad, periodo_escolar: '2026-4' })).toBe(false);
    expect(ok(detalleAcademico, { ...acad, periodo_escolar: '26-1' })).toBe(false);
  });
  it('rechaza campo faltante, enum malo y extra', () => {
    const { plataforma, ...sin } = acad;
    expect(ok(detalleAcademico, sin)).toBe(false);
    expect(ok(detalleAcademico, { ...acad, plataforma: 'moodle' })).toBe(false);
    expect(ok(detalleAcademico, { ...acad, x: 1 })).toBe(false);
  });
});

describe('crearIncidenciaSchema', () => {
  const base = {
    titulo: 'Switch sin respuesta',
    descripcion: 'No hay red en el laboratorio desde las 8:00',
    categoria: 'computo_redes',
    prioridad: 'alta',
    ubicacion: { edificio: 'Laboratorios', piso: 1, espacio: 'LC-2' },
    detalle_especifico: redes,
  };
  it('acepta válido en las 3 categorías', () => {
    expect(ok(crearIncidenciaSchema, base)).toBe(true);
    expect(ok(crearIncidenciaSchema, { ...base, categoria: 'infraestructura_fisica', detalle_especifico: infra })).toBe(true);
    expect(ok(crearIncidenciaSchema, { ...base, categoria: 'servicios_academicos', detalle_especifico: acad })).toBe(true);
  });
  it('piso es opcional', () => {
    expect(ok(crearIncidenciaSchema, { ...base, ubicacion: { edificio: 'A', espacio: 'B' } })).toBe(true);
  });
  it('rechaza detalle de otra categoría', () => {
    expect(ok(crearIncidenciaSchema, { ...base, detalle_especifico: infra })).toBe(false);
    expect(ok(crearIncidenciaSchema, { ...base, categoria: 'servicios_academicos', detalle_especifico: redes })).toBe(false);
  });
  it('rechaza título corto, prioridad mala y campos extra (reportante)', () => {
    expect(ok(crearIncidenciaSchema, { ...base, titulo: 'abc' })).toBe(false);
    expect(ok(crearIncidenciaSchema, { ...base, prioridad: 'urgente' })).toBe(false);
    expect(ok(crearIncidenciaSchema, { ...base, reportante: { nombre: 'x' } })).toBe(false);
  });
  it('rechaza descripción corta y categoría inexistente', () => {
    expect(ok(crearIncidenciaSchema, { ...base, descripcion: 'corta' })).toBe(false);
    expect(ok(crearIncidenciaSchema, { ...base, categoria: 'otra' })).toBe(false);
  });
  it('rechaza ubicación con edificio vacío o extra', () => {
    expect(ok(crearIncidenciaSchema, { ...base, ubicacion: { edificio: '', espacio: 'B' } })).toBe(false);
    expect(ok(crearIncidenciaSchema, { ...base, ubicacion: { edificio: 'A', espacio: 'B', z: 1 } })).toBe(false);
  });
});

describe('cambiarEstadoSchema', () => {
  const v = { estado_nuevo: 'en proceso', horas: 1.5, comentario: 'Revisando uplink' };
  it('acepta válido y horas 0 y 24', () => {
    expect(ok(cambiarEstadoSchema, v)).toBe(true);
    expect(ok(cambiarEstadoSchema, { ...v, horas: 0 })).toBe(true);
    expect(ok(cambiarEstadoSchema, { ...v, horas: 24 })).toBe(true);
  });
  it('rechaza horas negativas, 25 y NaN', () => {
    expect(ok(cambiarEstadoSchema, { ...v, horas: -1 })).toBe(false);
    expect(ok(cambiarEstadoSchema, { ...v, horas: 25 })).toBe(false);
    expect(ok(cambiarEstadoSchema, { ...v, horas: NaN })).toBe(false);
  });
  it('rechaza estado malo, comentario corto y extra', () => {
    expect(ok(cambiarEstadoSchema, { ...v, estado_nuevo: 'reabierta' })).toBe(false);
    expect(ok(cambiarEstadoSchema, { ...v, comentario: 'ab' })).toBe(false);
    expect(ok(cambiarEstadoSchema, { ...v, extra: 1 })).toBe(false);
  });
});

describe('etiquetaSchema', () => {
  it('normaliza trim y minúsculas', () => {
    expect(etiquetaSchema.parse('  Sin-RED  ')).toBe('sin-red');
  });
  it('rechaza muy corta o muy larga', () => {
    expect(ok(etiquetaSchema, 'a')).toBe(false);
    expect(ok(etiquetaSchema, 'a'.repeat(41))).toBe(false);
  });
});

describe('editarIncidenciaSchema', () => {
  it('acepta uno o varios campos', () => {
    expect(ok(editarIncidenciaSchema, { prioridad: 'baja' })).toBe(true);
    expect(ok(editarIncidenciaSchema, { titulo: 'Nuevo título', ubicacion: { edificio: 'A', espacio: 'B' } })).toBe(true);
  });
  it('rechaza objeto vacío y extras', () => {
    expect(ok(editarIncidenciaSchema, {})).toBe(false);
    expect(ok(editarIncidenciaSchema, { estado: 'cerrada' })).toBe(false);
  });
});
