---
name: auditoria-visual
description: Auditoría de contraste/legibilidad claro-oscuro de la UI de UTM Desk con capturas reales por CDP (Chrome headless). Úsala tras cambiar colores, temas o componentes visibles, y antes de cerrar cualquier lote de UI.
---

# Auditoría visual claro/oscuro (UTM Desk)

Flujo probado en este repo para detectar y corregir problemas de legibilidad entre el modo claro y el modo oscuro.

## Preparación

1. Levantar los dos servidores:
   - `cd server && npm run dev` (API en `localhost:4000`, contra Atlas real)
   - `cd web && npm run dev` (web en `localhost:5173`)
2. Verificar: `curl -s http://localhost:4000/api/health` → `{"ok":true}` y `curl -o /dev/null -w "%{http_code}" http://localhost:5173` → `200`.

## Capturas

Usar `server/scripts/capturas-ui-mac.mjs` (macOS) como base. El script:

- Abre Chrome headless con `--remote-debugging-port` y un perfil temporal.
- Hace login vía `POST /api/auth/login` con `SEED_DEFAULT_PASSWORD` de `server/.env` (nunca escribir la contraseña en el código ni en el output).
- Inyecta la sesión en `localStorage` (`utm-desk-sesion`) y el tema (`utm-desk-tema`: `claro` | `oscuro`; también añadir `document.documentElement.classList.add("dark")` tras navegar, por si la página no respeta el valor guardado).
- Captura cada pantalla con `Page.captureScreenshot` (PNG en `/tmp/` o `docs/capturas/`).

Pantallas mínimas a cubrir: login, lista, detalle (página completa), nueva incidencia, búsqueda, analítica, modal de cierre de sesión, drawer móvil (390×844), y TODA pantalla nueva (`/admin`, `/admin/incidencias`, `/admin/metricas`, `/registro`, secciones nuevas como Novedades). Repetir en `claro` y `oscuro` y por cada rol relevante.

## Qué revisar en cada captura

- Texto sobre fondo: ¿se lee todo? (códigos INC, "Sin asignar", hints, placeholders)
- Insignias de estado/prioridad: borde visible y texto legible en ambos temas.
- Botones primarios: texto blanco sobre verde (ojo: `btn-primario` aplica `text-white` por `@apply`, no genera clase en el DOM — el override es `.dark .btn-primario { color:#fff }`).
- Elementos que no son clases normales: `::file-selector-button`, `::placeholder`, `::selection`, SVG inline con colores literales (gráficas: revisar `BarrasHorizontales.jsx`).
- Overlays translúcidos `bg-white/N` del menú lateral (bajo `.dark` deben seguir siendo blanco translúcido).
- Estados: hover, focus (anillo verde), disabled (opacity-55), vacío, error, cargando.

## Correcciones

- Todo va en `web/src/index.css`, dentro de `@layer utilities` cuando compita con utilidades `!` (con `!important` el orden de capas se invierte).
- Patrón: remapear el token bajo `.dark` (`--color-slate-400: #64748b`, etc.) cuando el color se usa con el mismo sentido semántico; override por clase cuando un token se usa como texto Y como fondo (ej. `red-700/800`).
- Nunca tocar componentes para un problema global de color.

## Verificación final

- `cd web && npm run build` en verde.
- Verificar un color computado por CDP si una regla "no pega": `getComputedStyle(el).color` en `Runtime.evaluate`.
- Regenerar capturas y confirmar visualmente; actualizar `docs/capturas/` y el mockup si el cambio es visible.
