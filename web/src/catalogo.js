// Catálogos de dominio (enunciado / plan §4): valores de BD y su etiqueta legible.
export const CATEGORIAS = {
  computo_redes: "Cómputo y redes",
  infraestructura: "Infraestructura",
  academico: "Académico",
};

export const ESTADOS = {
  abierta: "Abierta",
  "en proceso": "En proceso",
  "en espera": "En espera",
  resuelta: "Resuelta",
  cerrada: "Cerrada",
};

export const PRIORIDADES = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

// Edificios fijos del campus.
export const EDIFICIOS = [
  "Edificio A",
  "Edificio B",
  "Laboratorios de Cómputo",
  "Biblioteca",
  "Administrativo",
];

// Icono de cada categoría (nombres de components/Iconos.jsx).
export const ICONO_CATEGORIA = {
  computo_redes: "red",
  infraestructura: "herramienta",
  academico: "libro",
};

// Descripción corta de cada categoría para el formulario.
export const DESCRIPCION_CATEGORIA = {
  computo_redes: "Switches, Wi-Fi, servidores y equipos de laboratorio",
  infraestructura: "Filtraciones, luminarias, climatización y cerraduras",
  academico: "Aula virtual, portal de calificaciones y correo",
};

export const DESCRIPCION_PRIORIDAD = {
  baja: "Puede esperar",
  media: "Afecta, pero hay alternativa",
  alta: "Frena una actividad",
  critica: "Riesgo o servicio caído",
};
