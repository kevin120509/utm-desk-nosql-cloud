// Paginación anterior/siguiente con número de página y total.
export default function Paginacion({ pagina, limite, total, onCambiar }) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  const boton =
    "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-700">
        Página {pagina} de {totalPaginas} · {total} incidencia{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        <button type="button" className={boton} disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          Anterior
        </button>
        <button type="button" className={boton} disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
          Siguiente
        </button>
      </div>
    </nav>
  );
}
