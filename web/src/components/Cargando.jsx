// Indicador de carga reutilizable con el rombo UTM. Mantiene la altura
// para que el contenido no "salte" al llegar.
export default function Cargando({ texto = "Cargando…" }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-40 items-center justify-center gap-3 p-8 text-slate-700">
      <img
        src="/logo-utm-rombo.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="animacion-rombo size-8 select-none"
      />
      <span>{texto}</span>
    </div>
  );
}
