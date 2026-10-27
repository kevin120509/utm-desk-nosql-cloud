import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SesionProvider } from "./auth/SesionContext.jsx";
import RutaProtegida from "./auth/RutaProtegida.jsx";
import { ROLES_CREAR, ROLES_ANALITICA, ROLES_ADMIN } from "./auth/permisos.js";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Incidencias from "./pages/Incidencias.jsx";
import NuevaIncidencia from "./pages/NuevaIncidencia.jsx";
import Detalle from "./pages/Detalle.jsx";
import Cargando from "./components/Cargando.jsx";

// Recharts pesa bastante y solo lo usan coordinador y directivo: se descarga bajo demanda.
const Analitica = lazy(() => import("./pages/Analitica.jsx"));

// Módulo administrativo (solo superAdmin): cada página se descarga cuando se abre.
const AdminInicio = lazy(() => import("./pages/admin/AdminInicio.jsx"));
const AdminUsuarios = lazy(() => import("./pages/admin/AdminUsuarios.jsx"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles.jsx"));
const AdminCatalogos = lazy(() => import("./pages/admin/AdminCatalogos.jsx"));
const AdminIncidencias = lazy(() => import("./pages/admin/AdminIncidencias.jsx"));
const AdminBitacora = lazy(() => import("./pages/admin/AdminBitacora.jsx"));
const AdminMetricas = lazy(() => import("./pages/admin/AdminMetricas.jsx"));
const AdminSistema = lazy(() => import("./pages/admin/AdminSistema.jsx"));

// Envuelve una página perezosa con su estado de carga.
const enCarga = (Pagina, texto = "Cargando…") => (
  <Suspense fallback={<Cargando texto={texto} />}>
    <Pagina />
  </Suspense>
);

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
              {/* Módulo administrativo: solo superAdmin (la API vuelve a comprobarlo en cada ruta). */}
              <Route element={<RutaProtegida roles={ROLES_ADMIN} />}>
                <Route path="/admin" element={enCarga(AdminInicio, "Cargando administración…")} />
                <Route path="/admin/usuarios" element={enCarga(AdminUsuarios)} />
                <Route path="/admin/roles" element={enCarga(AdminRoles)} />
                <Route path="/admin/catalogos" element={enCarga(AdminCatalogos)} />
                <Route path="/admin/incidencias" element={enCarga(AdminIncidencias)} />
                <Route path="/admin/bitacora" element={enCarga(AdminBitacora)} />
                <Route path="/admin/metricas" element={enCarga(AdminMetricas)} />
                <Route path="/admin/sistema" element={enCarga(AdminSistema)} />
              </Route>
              <Route path="*" element={<Navigate to="/incidencias" replace />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </BrowserRouter>
  );
}
