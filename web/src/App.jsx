import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Pantalla mínima de T01: comprueba que la web alcanza a la API.
export default function App() {
  const [estado, setEstado] = useState("comprobando…");

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setEstado(d.ok ? "API en línea" : "API con problemas"))
      .catch(() => setEstado("API sin conexión"));
  }, []);

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-emerald-800">UTM Desk</h1>
        <p className="mt-2 text-slate-600">Sistema de incidencias del campus</p>
        <p className="mt-4 text-sm text-slate-500">{estado}</p>
      </div>
    </main>
  );
}
