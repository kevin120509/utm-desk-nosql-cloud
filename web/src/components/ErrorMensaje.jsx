// Mensaje de error reutilizable. Acepta un Error de la API o un texto.
export default function ErrorMensaje({ error, mensaje, onReintentar }) {
  const texto = mensaje || error?.mensaje || error?.message || "Ocurrió un error inesperado.";
  const detalles = Array.isArray(error?.detalles) ? error.detalles : [];
  return (
    <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
      <p className="font-medium">{texto}</p>
      {detalles.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {detalles.map((d, i) => (
            <li key={i}>{typeof d === "string" ? d : d.mensaje || JSON.stringify(d)}</li>
          ))}
        </ul>
      )}
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="mt-3 rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
