import Icono from "./Iconos.jsx";

// Mensaje de error reutilizable. Acepta un Error de la API o un texto.
export default function ErrorMensaje({ error, mensaje, onReintentar }) {
  const texto = mensaje || error?.mensaje || error?.message || "Ocurrió un error inesperado.";
  const detalles = Array.isArray(error?.detalles) ? error.detalles : [];
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
      <Icono nombre="alerta" className="mt-0.5 text-red-700" />
      <div className="min-w-0">
        <p className="font-semibold">{texto}</p>
        {detalles.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {detalles.map((d, i) => (
              <li key={i}>{typeof d === "string" ? d : d.mensaje || JSON.stringify(d)}</li>
            ))}
          </ul>
        )}
        {onReintentar && (
          <button type="button" onClick={onReintentar} className="btn btn-peligro mt-3 min-h-9! py-1!">
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
