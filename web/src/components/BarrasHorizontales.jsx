import { useEffect, useState } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ALTO_FILA = 44; // píxeles por barra
const COLOR_BARRA = "#0f7050"; // marca-600: contraste AA sobre fondo blanco

// ¿Pantalla angosta? En móvil la columna de etiquetas se reduce para que las
// barras queden pegadas a la izquierda en vez de flotar a la derecha.
function useMovil() {
  const [movil, setMovil] = useState(() => window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const alCambiar = () => setMovil(mq.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);
  return movil;
}

// Gráfica de barras horizontales. La etiqueta con el valor va escrita junto a cada barra
// (no se depende solo del color) y `descripcion` resume la gráfica para lectores de pantalla.
// Siempre se muestra junto a una tabla con los mismos datos.
export default function BarrasHorizontales({ datos, claveNombre, claveValor, unidad, descripcion }) {
  const movil = useMovil();
  const filas = datos.map((d) => ({ nombre: d[claveNombre], valor: d[claveValor] }));
  const formato = (v) => `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(v)} ${unidad}`;
  // En móvil las etiquetas largas se recortan (el nombre completo está en la tabla de abajo).
  const corta = (n) => (n.length > 14 ? `${n.slice(0, 13)}…` : n);

  return (
    <div role="img" aria-label={descripcion} style={{ width: "100%", height: filas.length * ALTO_FILA + 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: movil ? 52 : 72, bottom: 4, left: 0 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={movil ? 92 : 150}
            tick={{ fill: "#334155", fontSize: movil ? 12 : 14 }}
            tickFormatter={movil ? corta : undefined}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={(v) => [formato(v), ""]} separator="" cursor={{ fill: "#eef8f2" }} />
          <Bar dataKey="valor" fill={COLOR_BARRA} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="valor" position="right" formatter={formato} fill="#0f172a" fontSize={13} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
