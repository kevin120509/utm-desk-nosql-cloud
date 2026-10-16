// Estado vacío reutilizable (listas sin resultados).
export default function EstadoVacio({ titulo = "Sin resultados", texto, children }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-medium text-slate-800">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-slate-600">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
