import { formatearFecha, formatearPeso } from "../formato.js";
import Icono from "./Iconos.jsx";

const TIPOS = { "image/jpeg": "Imagen JPEG", "image/png": "Imagen PNG", "application/pdf": "Documento PDF" };

// Lista de evidencias. Las URLs firmadas expiran: si `url_expira` ya venció
// se avisa al usuario en lugar de mostrar un enlace roto.
export default function Evidencias({ evidencias }) {
  const ahora = Date.now();
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {evidencias.map((ev, i) => {
        const expirada = ev.url_expira ? new Date(ev.url_expira).getTime() <= ahora : false;
        const esImagen = ev.tipo_mime === "image/jpeg" || ev.tipo_mime === "image/png";
        const esPdf = ev.tipo_mime === "application/pdf";
        return (
          <li key={`${ev.nombre_archivo}-${i}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {expirada ? (
              <p role="status" className="m-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                El enlace expiró. Recarga el expediente para verla de nuevo.
              </p>
            ) : (
              ev.url_storage &&
              (esImagen ? (
                <a href={ev.url_storage} target="_blank" rel="noopener noreferrer" className="block bg-slate-100">
                  <img
                    src={ev.url_storage}
                    loading="lazy"
                    alt={`Vista previa de la evidencia ${ev.nombre_archivo}`}
                    className="aspect-video w-full object-cover"
                  />
                </a>
              ) : (
                esPdf && (
                  <a
                    href={ev.url_storage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-marca-50 text-marca-800 hover:bg-marca-100"
                  >
                    <Icono nombre="archivo" tamano={36} />
                    <span className="text-sm font-semibold">Abrir PDF</span>
                  </a>
                )
              ))
            )}
            <div className="p-3">
              <p className="break-words text-sm font-semibold text-slate-900">{ev.nombre_archivo}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {TIPOS[ev.tipo_mime] || ev.tipo_mime}
                {ev.peso_kb !== undefined && ` · ${formatearPeso(ev.peso_kb)}`}
                {ev.fecha_carga && ` · ${formatearFecha(ev.fecha_carga)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
