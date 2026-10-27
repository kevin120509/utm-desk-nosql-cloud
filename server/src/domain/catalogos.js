// Valores iniciales de los catálogos administrables. Mientras la colección `catalogos` esté vacía,
// el sistema se comporta como siempre (estos valores). La primera vez que el superAdmin edita un
// catálogo, se siembran en la base y desde ahí se administran.
import { CATEGORIAS } from './enumeraciones.js';

export const CATEGORIAS_BASE = {
  computo_redes: { nombre: 'Cómputo y redes', descripcion: 'Equipos, red, software y cuentas.' },
  infraestructura: { nombre: 'Infraestructura', descripcion: 'Instalaciones, mobiliario y servicios del edificio.' },
  academico: { nombre: 'Académico', descripcion: 'Aulas, laboratorios y recursos para clase.' },
};

export const EDIFICIOS_BASE = ['Edificio A', 'Edificio B', 'Laboratorios de Cómputo', 'Biblioteca', 'Administrativo'];

/** Documentos que se siembran en `catalogos` la primera vez. */
export function documentosBase(ahora) {
  return [
    ...CATEGORIAS.map((clave) => ({
      tipo: 'categoria',
      clave,
      nombre: CATEGORIAS_BASE[clave].nombre,
      descripcion: CATEGORIAS_BASE[clave].descripcion,
      activo: true,
      fecha_creacion: ahora,
    })),
    ...EDIFICIOS_BASE.map((nombre) => ({ tipo: 'edificio', nombre, activo: true, espacios: [], fecha_creacion: ahora })),
  ];
}
