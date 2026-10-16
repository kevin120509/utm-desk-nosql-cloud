import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SesionProvider } from "./auth/SesionContext.jsx";
import RutaProtegida from "./auth/RutaProtegida.jsx";
import { ROLES_CREAR, ROLES_ANALITICA } from "./auth/permisos.js";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Incidencias from "./pages/Incidencias.jsx";
import NuevaIncidencia from "./pages/NuevaIncidencia.jsx";
import Detalle from "./pages/Detalle.jsx";
import Cargando from "./components/Cargando.jsx";

// Recharts pesa bastante y solo lo usan coordinador y directivo: se descarga bajo demanda.
const Analitica = lazy(() => import("./pages/Analitica.jsx"));

// Rutas de la app. Las protegidas exigen sesión; algunas, un rol (plan §5).
export default function App() {
  return (
    <BrowserRouter>
      <SesionProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/incidencias" replace />} />
              <Route path="/incidencias" element={<Incidencias />} />
              <Route element={<RutaProtegida roles={ROLES_CREAR} />}>
                <Route path="/incidencias/nueva" element={<NuevaIncidencia />} />
              </Route>
              <Route path="/incidencias/:codigo" element={<Detalle />} />
              <Route element={<RutaProtegida roles={ROLES_ANALITICA} />}>
                <Route
                  path="/analitica"
                  element={
                    <Suspense fallback={<Cargando texto="Cargando analítica…" />}>
                      <Analitica />
                    </Suspense>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/incidencias" replace />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </BrowserRouter>
  );
}
