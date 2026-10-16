// Las pruebas de integración hablan con Atlas y Supabase por internet (planes gratuitos):
// - el límite por defecto de 5 s de Vitest es muy justo;
// - correr todos los archivos a la vez produce fallos intermitentes por contención;
// - la red puede cortar una petición suelta (ECONNRESET, "fetch failed").
// Por eso: timeouts amplios, archivos en serie y hasta 2 reintentos por prueba.
// Un fallo REAL de código falla las 3 veces; un corte de red casi nunca.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    retry: 2,
  },
});
