// Las pruebas de integración hablan con Atlas por internet (M0 compartido, ~100 ops/s):
// - el límite por defecto de 5 s de Vitest es muy justo;
// - correr todos los archivos a la vez produce fallos intermitentes por contención.
// Por eso: timeouts amplios y archivos de prueba en serie (no son errores de código).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
