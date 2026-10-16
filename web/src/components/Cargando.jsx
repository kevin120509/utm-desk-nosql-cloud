// Indicador de carga reutilizable. Mantiene la altura para que el contenido no "salte" al llegar.
export default function Cargando({ texto = "Cargando…" }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-40 items-center justify-center gap-3 p-8 text-slate-700">
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-marca-600 border-t-transparent motion-reduce:animate-none"
      />
      <span>{texto}</span>
    </div>
  );
}
