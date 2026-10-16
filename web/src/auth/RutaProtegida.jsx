import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSesion } from "./SesionContext.jsx";
import Cargando from "../components/Cargando.jsx";

// Exige sesión y, opcionalmente, uno de los `roles` indicados.
// Sin sesión -> /login; con sesión pero sin permiso -> /incidencias.
export default function RutaProtegida({ roles }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();

  if (cargando) return <Cargando texto="Verificando sesión…" />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion }} />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/incidencias" replace />;
  return <Outlet />;
}
