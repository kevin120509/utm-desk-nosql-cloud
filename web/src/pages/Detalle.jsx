import { useParams } from "react-router-dom";

// Placeholder: el contenido real llega en F06.
export default function Detalle() {
  const { codigo } = useParams();
  return (
    <section>
      <h1 className="text-2xl font-bold text-emerald-800">Incidencia {codigo}</h1>
      <p className="mt-2 text-slate-700">En construcción</p>
    </section>
  );
}
