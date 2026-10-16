// Envoltorio accesible de un campo de formulario: label asociado, ayuda y error.
// `children` es una función que recibe las props de accesibilidad del control.
export const claseControl =
  "mt-1 block w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700";

export default function Campo({ id, etiqueta, requerido, ayuda, error, children }) {
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {etiqueta}
        {requerido ? (
          <span aria-hidden="true" className="text-red-700"> *</span>
        ) : (
          <span className="font-normal text-slate-600"> (opcional)</span>
        )}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        className: `${claseControl} ${error ? "border-red-700" : ""}`,
      })}
      {ayuda && <p id={idAyuda} className="mt-1 text-xs text-slate-600">{ayuda}</p>}
      {error && <p id={idError} className="mt-1 text-sm text-red-800">{error}</p>}
    </div>
  );
}
