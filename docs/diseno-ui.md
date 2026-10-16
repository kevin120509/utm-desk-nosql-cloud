# Diseño de la interfaz (F08)

Fecha: 2026-10-16 · Herramientas usadas: skill *ui-ux-pro-max* (sistema de diseño y guías de UX), *design-critique* y
*accessibility-review* (marco de revisión), navegador integrado (capturas en escritorio y móvil) y un cálculo de contraste WCAG.

## Diagnóstico inicial (crítica de diseño)

| Hallazgo | Severidad | Qué se hizo |
|---|---|---|
| Sin identidad visual: cabecera blanca genérica, sin marca ni jerarquía | Alta | Barra lateral verde institucional con logotipo, usuario y rol; fondo claro verdoso |
| La lista era una tabla plana con insignias diminutas; la prioridad solo se distinguía por un color pálido | Alta | Fila de dos líneas (código, título, categoría y lugar), borde de color por prioridad, insignias con punto/marca además de color |
| Filtros en un cuadro grande de cuatro selectores | Media | "Pastillas" de estado de un clic + tres selectores compactos |
| El panel "Actualizar estado" empujaba el expediente hacia abajo | Alta | Expediente en dos columnas: contenido a la izquierda y acciones fijas (sticky) a la derecha |
| Bitácora poco legible | Media | Línea de tiempo con iconos, estado anterior → nuevo, autor y fecha |
| Evidencias como texto | Media | Tarjetas con miniatura (imagen) o icono de PDF |
| Formulario largo sin estructura | Media | 3 secciones numeradas (¿Qué ocurre? · ¿Dónde? · Detalle técnico) |
| Analítica sin contexto | Media | Indicadores arriba (resueltas, promedio, horas, edificio más lento) y gráfica + tabla |
| Estados vacíos y de error escuetos | Media | Icono, explicación y acción (limpiar filtros, ver todas, reintentar) |

## Sistema de diseño

- **Estilo:** *Data-Dense Dashboard* (skill): denso pero ordenado, tablas legibles, sin adornos.
- **Color:** verde institucional UTM (`marca-50…950`, principal `#0b5d42`) con lima `#8bc34a` solo como acento decorativo.
  Se descartó el morado que sugería el generador porque la portada y la marca de la UTM son verdes.
- **Tipografía:** Lexend (títulos, diseñada para legibilidad) + Source Sans 3 (texto): par "Corporate Trust" de la skill.
- **Componentes** (en `web/src/index.css`): `.tarjeta`, `.btn` (`-primario`, `-secundario`, `-fantasma`, `-peligro`), `.campo`,
  `.etiqueta-campo`, `.insignia`, `.titulo-pagina`, `.enlace`. Iconos SVG propios en `components/Iconos.jsx` (sin emojis).
- **Estados:** abierta (azul), en proceso (ámbar), en espera (violeta), resuelta (verde), cerrada (gris); prioridad con barras
  de tamaño creciente. Siempre llevan texto: el color nunca es el único indicador.

## Accesibilidad (WCAG 2.1 AA)

- Contraste calculado, no estimado: 23 de 24 pares cumplían; el borde de los campos (1.48:1) **fallaba** el criterio 1.4.11 y se
  corrigió a `slate-500` (4.76:1). Texto normal entre 4.76:1 y 17.85:1; botón primario 7.90:1; anillo de foco 4.32:1 (mín. 3:1).
- Foco de teclado siempre visible (anillo verde de 3 px); enlace "Saltar al contenido".
- Objetivos táctiles de 44 px (botones, campos y pastillas).
- `prefers-reduced-motion` respetado; gráficas con resumen para lectores de pantalla y tabla equivalente.
- Menú móvil con `aria-expanded`/`aria-controls`; formularios con `label`, ayuda y errores asociados (`aria-describedby`).

## Verificación

Revisado en navegador (escritorio 1100 px y móvil) con los roles coordinador y reportante: login, lista, detalle, analítica,
nueva incidencia y menú móvil. `npm run build` sin errores; el paquete principal pesa ~101 kB comprimido y la analítica
(con Recharts) se carga bajo demanda.

## Pendiente / mejoras opcionales

- Modo oscuro (no se pidió).
- Fuentes autoalojadas (hoy vienen de Google Fonts; si falla la red se usa la fuente del sistema).
- Probar con lector de pantalla real (NVDA/VoiceOver): aquí solo se verificó estructura, contraste y teclado por código.
