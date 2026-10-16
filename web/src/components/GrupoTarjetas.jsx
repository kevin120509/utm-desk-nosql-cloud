import Icono from "./Iconos.jsx";

// Grupo de opciones como tarjetas seleccionables (radio accesible con icono y descripción).
// Cada <input type="radio"> está visualmente oculto pero es real: funciona con teclado (flechas),
// lectores de pantalla y formularios. El estado "marcado" se pinta con `peer-checked`.
export default function GrupoTarjetas({ nombre, etiqueta, valor, onChange, opciones, error, requerido, columnas = "sm:grid-cols-3" }) {
  const idError = `${nombre}-error`;
  return (
    <fieldset aria-describedby={error ? idError : undefined}>
      <legend className="etiqueta-campo">
        {etiqueta}
        {requerido && <span aria-hidden="true" className="text-red-700"> *</span>}
      </legend>
      <div className={`mt-2 grid gap-3 ${columnas}`}>
        {opciones.map((o) => (
          <div key={o.valor} className="relative">
            <input
              type="radio"
              id={`${nombre}-${o.valor}`}
              name={nombre}
              value={o.valor}
              checked={valor === o.valor}
              onChange={onChange}
              required={requerido}
              className="peer sr-only"
            />
            <label
              htmlFor={`${nombre}-${o.valor}`}
              className="flex h-full min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-400 bg-white p-3.5 transition-colors duration-150 hover:border-slate-600 peer-checked:border-marca-700 peer-checked:bg-marca-50 peer-checked:ring-2 peer-checked:ring-marca-600 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marca-500"
            >
              {o.icono && (
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 peer-checked:bg-marca-100">
                  <Icono nombre={o.icono} tamano={20} />
                </span>
              )}
              {o.punto && <span aria-hidden="true" className={`mt-1.5 size-3 shrink-0 rounded-full ${o.punto}`} />}
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">{o.titulo}</span>
                {o.descripcion && <span className="mt-0.5 block text-sm text-slate-600">{o.descripcion}</span>}
              </span>
            </label>
          </div>
        ))}
      </div>
      {error && (
        <p id={idError} className="mt-1.5 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </fieldset>
  );
}
