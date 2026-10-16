// Las pruebas de integración hablan con Atlas por internet: el límite por defecto de
// 5 s de Vitest es muy justo y produce fallos intermitentes (no son errores de código).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
