import { describe, it, expect } from 'vitest';
import { transicionValida, ESTADOS, ROLES } from '../../src/domain/index.js';

describe('transicionValida', () => {
  const abiertos = ['abierta', 'en proceso', 'en espera'];

  it('desde estados abiertos va a los otros dos y a resuelta (tecnico y coordinador)', () => {
    for (const desde of abiertos) {
      for (const rol of ['tecnico', 'coordinador']) {
        for (const hacia of [...abiertos.filter((e) => e !== desde), 'resuelta']) {
          expect(transicionValida(desde, hacia, rol)).toBe(true);
        }
      }
    }
  });

  it('nada vuelve a abierta ni pasa directo a cerrada desde abiertos', () => {
    // abierta -> abierta es mismo estado; en proceso -> abierta SÍ está permitido por el plan
    for (const desde of abiertos) {
      expect(transicionValida(desde, 'cerrada', 'coordinador')).toBe(false);
    }
  });

  it('resuelta -> cerrada solo coordinador', () => {
    expect(transicionValida('resuelta', 'cerrada', 'coordinador')).toBe(true);
    expect(transicionValida('resuelta', 'cerrada', 'tecnico')).toBe(false);
    expect(transicionValida('resuelta', 'cerrada', 'reportante')).toBe(false);
    expect(transicionValida('resuelta', 'cerrada', 'directivo')).toBe(false);
  });

  it('resuelta no se reabre', () => {
    for (const hacia of abiertos) expect(transicionValida('resuelta', hacia, 'coordinador')).toBe(false);
  });

  it('cerrada es final', () => {
    for (const hacia of ESTADOS) expect(transicionValida('cerrada', hacia, 'coordinador')).toBe(false);
  });

  it('mismo estado es inválido', () => {
    for (const e of ESTADOS) expect(transicionValida(e, e, 'coordinador')).toBe(false);
  });

  it('reportante y directivo no cambian estado', () => {
    for (const rol of ['reportante', 'directivo']) {
      expect(transicionValida('abierta', 'en proceso', rol)).toBe(false);
    }
  });

  it('valores desconocidos son inválidos', () => {
    expect(transicionValida('abierta', 'xyz', 'tecnico')).toBe(false);
    expect(transicionValida('abierta', 'en proceso', 'admin')).toBe(false);
    expect(ROLES.length).toBe(5);
  });
});
