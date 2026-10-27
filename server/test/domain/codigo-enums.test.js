import { describe, it, expect } from 'vitest';
import { generarCodigo, CATEGORIAS, PRIORIDADES, ESTADOS, ROLES, TIPOS_REPORTANTE } from '../../src/domain/index.js';

describe('generarCodigo', () => {
  it('rellena a 4 dígitos', () => {
    expect(generarCodigo(2026, 42)).toBe('INC-2026-0042');
    expect(generarCodigo(2026, 1)).toBe('INC-2026-0001');
    expect(generarCodigo(2026, 9999)).toBe('INC-2026-9999');
  });
  it('no trunca arriba de 9999', () => {
    expect(generarCodigo(2026, 12345)).toBe('INC-2026-12345');
  });
  it('valida entradas', () => {
    expect(() => generarCodigo(2026, 0)).toThrow();
    expect(() => generarCodigo(2026, -3)).toThrow();
    expect(() => generarCodigo(2026, 1.5)).toThrow();
    expect(() => generarCodigo('2026', 1)).toThrow();
    expect(() => generarCodigo(0, 1)).toThrow();
  });
});

describe('enumeraciones', () => {
  it('tienen los valores del plan', () => {
    expect(PRIORIDADES).toEqual(['baja', 'media', 'alta', 'critica']);
    expect(ESTADOS).toEqual(['abierta', 'en proceso', 'en espera', 'resuelta', 'cerrada']);
    expect(CATEGORIAS).toEqual(['computo_redes', 'infraestructura_fisica', 'servicios_academicos']);
    expect(ROLES).toEqual(['reportante', 'tecnico', 'coordinador', 'directivo', 'superAdmin']);
    expect(TIPOS_REPORTANTE).toEqual(['docente', 'estudiante', 'administrativo']);
  });
});
