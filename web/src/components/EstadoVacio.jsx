import Icono from "./Iconos.jsx";

// Estado vacío reutilizable (listas sin resultados): explica qué pasó y qué hacer.
export default function EstadoVacio({ titulo = "Sin resultados", texto, icono = "buzon", children }) {
  return (
    <div className="tarjeta flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-marca-50 text-marca-600">
        <Icono nombre={icono} tamano={28} />
      </span>
      <p className="mt-4 font-display text-lg font-semibold text-slate-900">{titulo}</p>
      {texto && <p className="mt-1 max-w-md text-slate-600">{texto}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
