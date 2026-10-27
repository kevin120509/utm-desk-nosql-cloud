import { useEffect, useState, useSyncExternalStore } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ALTO_FILA = 44; // píxeles por barra
// Paleta por nivel (familia marca): claro = valores bajos, medio = actual, oscuro = altos.
// Los terciles se calculan con min/max de los datos, así los colores se reasignan solos al actualizarse.
const NIVELES = { bajo: "#74c39d", medio: "#0f7050", alto: "#094b36" }; // marca-300 / 600 / 800

function colorDe(valor, min, max) {
  const rango = max - min;
  if (rango === 0) return NIVELES.medio;
  if (valor <= min + rango / 3) return NIVELES.bajo;
  if (valor <= min + (2 * rango) / 3) return NIVELES.medio;
  return NIVELES.alto;
}

// Colores de texto/fondo de la gráfica según el tema activo (clase .dark en <html>).
const TEMAS = {
  claro: { tick: "#334155", texto: "#0f172a", cursor: "#eef8f2" },
  oscuro: { tick: "#cbd5e1", texto: "#f1f5f9", cursor: "#143b2d" },
};

function useEsOscuro() {
  return useSyncExternalStore(
    (avisar) => {
      const obs = new MutationObserver(avisar);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => obs.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
  );
}

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
  const tema = TEMAS[useEsOscuro() ? "oscuro" : "claro"];
  const filas = datos.map((d) => ({ nombre: d[claveNombre], valor: d[claveValor] }));
  const valores = filas.map((f) => f.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
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
            tick={{ fill: tema.tick, fontSize: movil ? 12 : 14 }}
            tickFormatter={movil ? corta : undefined}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={(v) => [formato(v), ""]} separator="" cursor={{ fill: tema.cursor }} />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {filas.map((f) => (
              <Cell key={f.nombre} fill={colorDe(f.valor, min, max)} />
            ))}
            <LabelList dataKey="valor" position="right" formatter={formato} fill={tema.texto} fontSize={13} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
