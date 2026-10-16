// Indicador de carga reutilizable.
export default function Cargando({ texto = "Cargando…" }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 p-8 text-slate-700">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent"
      />
      <span>{texto}</span>
    </div>
  );
}
