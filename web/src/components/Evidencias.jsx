import { formatearFecha, formatearPeso } from "../formato.js";

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
          <li key={`${ev.nombre_archivo}-${i}`} className="rounded-md border border-slate-300 bg-white p-3">
            <p className="break-words font-medium text-slate-900">{ev.nombre_archivo}</p>
            <p className="text-sm text-slate-600">
              {ev.tipo_mime}
              {ev.peso_kb !== undefined && ` · ${formatearPeso(ev.peso_kb)}`}
              {ev.fecha_carga && ` · ${formatearFecha(ev.fecha_carga)}`}
            </p>
            {expirada ? (
              <p role="status" className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
                El enlace expiró, recarga el expediente.
              </p>
            ) : (
              ev.url_storage && (
                <div className="mt-2">
                  {esImagen && (
                    <a href={ev.url_storage} target="_blank" rel="noopener noreferrer">
                      <img
                        src={ev.url_storage}
                        loading="lazy"
                        alt={`Vista previa de la evidencia ${ev.nombre_archivo}`}
                        className="max-h-56 w-auto max-w-full rounded border border-slate-200"
                      />
                    </a>
                  )}
                  {esPdf && (
                    <a
                      href={ev.url_storage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-md border border-emerald-800 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      Abrir PDF
                    </a>
                  )}
                </div>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}
