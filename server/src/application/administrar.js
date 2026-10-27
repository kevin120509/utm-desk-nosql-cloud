// Casos de uso de solo lectura del superAdmin: bitácora, salud del sistema y métricas globales.
import { z } from "zod";

const bitacoraSchema = z.object({
  tipo: z.enum(["admin", "seguridad"]).optional(),
  accion: z.string().trim().max(60).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(30),
});

/** @param {{bitacoraRepo: object, adminRepo: {ping: Function, resumen: Function}, almacen: {salud?: Function},
 *           ultimoError?: () => ({codigo: string, ruta: string, fecha: Date, mensaje: string} | undefined), reloj?: () => Date}} deps */
export function administrar({ bitacoraRepo, adminRepo, almacen, ultimoError = () => undefined, reloj = () => new Date() }) {
  const vistaEvento = (e) => ({
    id: String(e._id),
    tipo: e.tipo,
    accion: e.accion,
    fecha: e.fecha,
    actor: e.actor ?? null,
    objetivo: e.objetivo ?? null,
    detalle: e.detalle ?? null,
    ip: e.ip ?? null,
  });

  return {
    async bitacora(_sesion, query) {
      const f = bitacoraSchema.parse(query ?? {});
      const { datos, total } = await bitacoraRepo.listar({ tipo: f.tipo, accion: f.accion || undefined, pagina: f.pagina, limite: f.limite });
      return { datos: datos.map(vistaEvento), total, pagina: f.pagina };
    },

    async salud() {
      const comprobar = async (fn) => {
        try {
          return await fn();
        } catch (e) {
          return { ok: false, detalle: String(e?.message ?? "Error").slice(0, 120) };
        }
      };
      const [mongo, almacenamiento] = await Promise.all([
        comprobar(async () => ({ ok: true, detalle: `Responde en ${await adminRepo.ping()} ms` })),
        comprobar(async () => (almacen?.salud ? almacen.salud() : { ok: false, detalle: "Sin comprobación" })),
      ]);
      // El último error interno solo aparece si lo hubo (sin campos vacíos ni secretos).
      const error = ultimoError();
      return {
        api: { ok: true, detalle: "Respondiendo" },
        mongo,
        almacenamiento,
        hora: reloj(),
        ...(error ? { ultimo_error: error } : {}),
      };
    },

    resumen: () => adminRepo.resumen(),
  };
}
