// Catálogos administrables por el superAdmin: categorías (las 3 claves del esquema; se pueden
// renombrar, describir y desactivar) y edificios con sus espacios (crear, renombrar, desactivar).
// Nunca se borra nada: se desactiva. Cada cambio queda en la bitácora.
import { z } from "zod";
import { CATEGORIAS, documentosBase, CATEGORIAS_BASE, EDIFICIOS_BASE } from "../domain/index.js";
import { ErrorApp } from "./errores.js";

const texto = (max, msg = "Texto inválido") => z.string({ error: msg }).trim().min(2, msg).max(max, msg);
const categoriaSchema = z
  .strictObject({ nombre: texto(60, "Nombre inválido").optional(), descripcion: texto(160, "Descripción inválida").optional(), activo: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: "No hay nada que actualizar" });
const edificioNuevoSchema = z.strictObject({ nombre: texto(80, "Nombre de edificio inválido"), espacios: z.array(texto(80, "Espacio inválido")).max(100).optional() });
const edificioCambioSchema = z
  .strictObject({ nombre: texto(80, "Nombre de edificio inválido").optional(), activo: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: "No hay nada que actualizar" });
const espacioNuevoSchema = z.strictObject({ nombre: texto(80, "Espacio inválido") });
const espacioCambioSchema = z
  .strictObject({ nombre: texto(80, "Espacio inválido").optional(), activo: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: "No hay nada que actualizar" });

const igual = (a, b) => a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
const vistaEdificio = (d) => ({ id: String(d._id), nombre: d.nombre, activo: d.activo !== false, espacios: (d.espacios ?? []).map((e) => ({ nombre: e.nombre, activo: e.activo !== false })) });
const vistaCategoria = (d) => ({ clave: d.clave, nombre: d.nombre, descripcion: d.descripcion ?? "", activo: d.activo !== false });

/** @param {{catalogosRepo: object, auditor: {registrarAdmin: Function}, reloj?: () => Date}} deps */
export function gestionarCatalogos({ catalogosRepo, auditor, reloj = () => new Date() }) {
  async function asegurarBase() {
    if ((await catalogosRepo.contar()) === 0) await catalogosRepo.sembrar(documentosBase(reloj()));
  }

  async function cargarEdificio(id) {
    const doc = await catalogosRepo.buscarEdificio(id);
    if (!doc) throw new ErrorApp("NO_ENCONTRADO", "El edificio no existe");
    return doc;
  }

  async function vistaAdmin() {
    const docs = await catalogosRepo.listar();
    return {
      categorias: CATEGORIAS.map((c) => docs.find((d) => d.tipo === "categoria" && d.clave === c)).filter(Boolean).map(vistaCategoria),
      edificios: docs.filter((d) => d.tipo === "edificio").map(vistaEdificio),
    };
  }

  return {
    /** Lo que ven todos los usuarios al reportar: solo lo activo. Con la colección vacía, los valores iniciales. */
    async publico() {
      if ((await catalogosRepo.contar()) === 0) {
        return {
          categorias: CATEGORIAS.map((clave) => ({ clave, nombre: CATEGORIAS_BASE[clave].nombre, descripcion: CATEGORIAS_BASE[clave].descripcion })),
          edificios: EDIFICIOS_BASE.map((nombre) => ({ nombre, espacios: [] })),
        };
      }
      const { categorias, edificios } = await vistaAdmin();
      return {
        categorias: categorias.filter((c) => c.activo).map(({ activo, ...c }) => c),
        edificios: edificios
          .filter((e) => e.activo)
          .map((e) => ({ nombre: e.nombre, espacios: e.espacios.filter((s) => s.activo).map((s) => ({ nombre: s.nombre })) })),
      };
    },

    /** Vista completa para el panel del superAdmin (incluye lo desactivado). */
    async listarAdmin() {
      await asegurarBase();
      return vistaAdmin();
    },

    /**
     * Comprueba una incidencia nueva contra el catálogo. Sin catálogo sembrado no restringe nada.
     * Lanza VALIDACION si la categoría o el edificio están desactivados o el espacio no está en la lista.
     */
    async validarUbicacion({ categoria, ubicacion }) {
      if ((await catalogosRepo.contar()) === 0) return;
      const cat = await catalogosRepo.buscarCategoria(categoria);
      if (cat && cat.activo === false) throw new ErrorApp("VALIDACION", "Esa categoría está desactivada");
      const edificio = await catalogosRepo.buscarEdificioPorNombre(ubicacion.edificio);
      if (!edificio) throw new ErrorApp("VALIDACION", "El edificio no está en el catálogo");
      if (edificio.activo === false) throw new ErrorApp("VALIDACION", "Ese edificio está desactivado");
      const activos = (edificio.espacios ?? []).filter((e) => e.activo !== false);
      if (activos.length && !activos.some((e) => igual(e.nombre, ubicacion.espacio))) {
        throw new ErrorApp("VALIDACION", "El espacio no está en el catálogo de ese edificio");
      }
    },

    async actualizarCategoria(sesion, clave, entrada) {
      if (!CATEGORIAS.includes(clave)) throw new ErrorApp("NO_ENCONTRADO", "La categoría no existe");
      const d = categoriaSchema.parse(entrada ?? {});
      await asegurarBase();
      if (d.activo === false) {
        const activas = (await catalogosRepo.listar()).filter((x) => x.tipo === "categoria" && x.activo !== false && x.clave !== clave);
        if (activas.length === 0) throw new ErrorApp("CONFLICTO", "Debe quedar al menos una categoría activa");
      }
      await catalogosRepo.actualizarCategoria(clave, { ...d, fecha_actualizacion: reloj() });
      await auditor.registrarAdmin("catalogo.categoria_actualizar", sesion, { tipo: "categoria", id: clave }, d);
      return vistaAdmin();
    },

    async crearEdificio(sesion, entrada) {
      const d = edificioNuevoSchema.parse(entrada ?? {});
      await asegurarBase();
      if (await catalogosRepo.buscarEdificioPorNombre(d.nombre)) throw new ErrorApp("CONFLICTO", "Ya existe un edificio con ese nombre");
      const espacios = [];
      for (const n of d.espacios ?? []) if (!espacios.some((e) => igual(e.nombre, n))) espacios.push({ nombre: n, activo: true });
      const creado = await catalogosRepo.insertarEdificio({ tipo: "edificio", nombre: d.nombre, activo: true, espacios, fecha_creacion: reloj() });
      await auditor.registrarAdmin("catalogo.edificio_crear", sesion, { tipo: "edificio", id: String(creado._id) }, { nombre: d.nombre });
      return { edificio: vistaEdificio(creado) };
    },

    async actualizarEdificio(sesion, id, entrada) {
      const d = edificioCambioSchema.parse(entrada ?? {});
      await asegurarBase();
      const doc = await cargarEdificio(id);
      if (d.nombre) {
        const otro = await catalogosRepo.buscarEdificioPorNombre(d.nombre);
        if (otro && String(otro._id) !== String(doc._id)) throw new ErrorApp("CONFLICTO", "Ya existe un edificio con ese nombre");
      }
      if (d.activo === false) {
        const activos = (await catalogosRepo.listar()).filter((x) => x.tipo === "edificio" && x.activo !== false && String(x._id) !== String(doc._id));
        if (activos.length === 0) throw new ErrorApp("CONFLICTO", "Debe quedar al menos un edificio activo");
      }
      await catalogosRepo.actualizar(id, { $set: { ...d, fecha_actualizacion: reloj() } });
      await auditor.registrarAdmin("catalogo.edificio_actualizar", sesion, { tipo: "edificio", id }, d);
      return { edificio: vistaEdificio(await cargarEdificio(id)) };
    },

    async agregarEspacio(sesion, id, entrada) {
      const d = espacioNuevoSchema.parse(entrada ?? {});
      await asegurarBase();
      const doc = await cargarEdificio(id);
      if ((doc.espacios ?? []).some((e) => igual(e.nombre, d.nombre))) throw new ErrorApp("CONFLICTO", "Ese espacio ya existe en el edificio");
      await catalogosRepo.actualizar(id, { $push: { espacios: { nombre: d.nombre, activo: true } }, $set: { fecha_actualizacion: reloj() } });
      await auditor.registrarAdmin("catalogo.espacio_crear", sesion, { tipo: "edificio", id }, { espacio: d.nombre });
      return { edificio: vistaEdificio(await cargarEdificio(id)) };
    },

    async actualizarEspacio(sesion, id, nombreActual, entrada) {
      const d = espacioCambioSchema.parse(entrada ?? {});
      await asegurarBase();
      const doc = await cargarEdificio(id);
      const espacios = (doc.espacios ?? []).map((e) => ({ ...e }));
      const i = espacios.findIndex((e) => e.nombre === nombreActual);
      if (i < 0) throw new ErrorApp("NO_ENCONTRADO", "El espacio no existe");
      if (d.nombre && espacios.some((e, j) => j !== i && igual(e.nombre, d.nombre))) throw new ErrorApp("CONFLICTO", "Ese espacio ya existe en el edificio");
      if (d.nombre) espacios[i].nombre = d.nombre;
      if (d.activo !== undefined) espacios[i].activo = d.activo;
      await catalogosRepo.actualizar(id, { $set: { espacios, fecha_actualizacion: reloj() } });
      await auditor.registrarAdmin("catalogo.espacio_actualizar", sesion, { tipo: "edificio", id }, { espacio: nombreActual, ...d });
      return { edificio: vistaEdificio(await cargarEdificio(id)) };
    },
  };
}
