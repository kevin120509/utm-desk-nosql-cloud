// Roles permitidos por sección (plan §5). La API es la que decide de verdad; esto solo oculta/redirige.
export const ROLES_CREAR = ["reportante", "tecnico", "coordinador"];
export const ROLES_ANALITICA = ["coordinador", "directivo"];
// Módulo administrativo (/admin): solo superAdmin.
export const ROLES_ADMIN = ["superAdmin"];

// Roles que se pueden asignar desde el panel (mismo orden que el servidor).
export const ROLES_ASIGNABLES = ["reportante", "tecnico", "coordinador", "directivo", "superAdmin"];
export const TIPOS_REPORTANTE = ["docente", "estudiante", "administrativo"];

export const NOMBRE_ROL = {
  reportante: "Reportante",
  tecnico: "Técnico",
  coordinador: "Coordinador",
  directivo: "Directivo",
  superAdmin: "Super administrador",
};
