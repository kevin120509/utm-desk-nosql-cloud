// Envoltorio accesible de un campo de formulario: label asociado, ayuda y error.
// `children` es una función que recibe las props de accesibilidad del control.
export const claseControl = "campo mt-1.5";

export default function Campo({ id, etiqueta, requerido, ayuda, error, children }) {
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const describedBy = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="etiqueta-campo">
        {etiqueta}
        {requerido ? (
          <span aria-hidden="true" className="text-red-700"> *</span>
        ) : (
          <span className="font-normal text-slate-500"> (opcional)</span>
        )}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        className: claseControl,
      })}
      {ayuda && <p id={idAyuda} className="mt-1.5 text-xs text-slate-600">{ayuda}</p>}
      {error && <p id={idError} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-red-800">{error}</p>}
    </div>
  );
}
