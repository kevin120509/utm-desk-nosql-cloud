import Icono from "./Iconos.jsx";

// Paginación anterior/siguiente con número de página y total.
// `unidad` = [singular, plural] de lo que se cuenta (por defecto, incidencias).
export default function Paginacion({ pagina, limite, total, onCambiar, unidad = ["incidencia", "incidencias"] }) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  const desde = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const hasta = Math.min(total, pagina * limite);
  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        Mostrando <strong className="font-semibold text-slate-900">{desde}–{hasta}</strong> de{" "}
        <strong className="font-semibold text-slate-900">{total}</strong> {total === 1 ? unidad[0] : unidad[1]}
        <span className="text-slate-500"> · Página {pagina} de {totalPaginas}</span>
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-secundario" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          <Icono nombre="izquierda" tamano={18} />
          Anterior
        </button>
        <button type="button" className="btn btn-secundario" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
          Siguiente
          <Icono nombre="derecha" tamano={18} />
        </button>
      </div>
    </nav>
  );
}
