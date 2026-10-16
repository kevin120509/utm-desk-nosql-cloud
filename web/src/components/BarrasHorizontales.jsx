import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ALTO_FILA = 44; // píxeles por barra
const COLOR_BARRA = "#047857"; // emerald-700: contraste AA sobre fondo blanco

// Gráfica de barras horizontales. La etiqueta con el valor va escrita junto a cada barra
// (no se depende solo del color) y `descripcion` resume la gráfica para lectores de pantalla.
// Siempre se muestra junto a una tabla con los mismos datos.
export default function BarrasHorizontales({ datos, claveNombre, claveValor, unidad, descripcion }) {
  const filas = datos.map((d) => ({ nombre: d[claveNombre], valor: d[claveValor] }));
  const formato = (v) => `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(v)} ${unidad}`;

  return (
    <div role="img" aria-label={descripcion} style={{ width: "100%", height: filas.length * ALTO_FILA + 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={150}
            tick={{ fill: "#334155", fontSize: 13 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={(v) => [formato(v), ""]} separator="" cursor={{ fill: "#ecfdf5" }} />
          <Bar dataKey="valor" fill={COLOR_BARRA} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="valor" position="right" formatter={formato} fill="#0f172a" fontSize={13} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
