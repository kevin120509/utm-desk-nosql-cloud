// Rutas de autenticación: POST /login, POST /registro y GET /me.
import { Router } from "express";
import { z } from "zod";
import { crearAutenticacion } from "../middlewares/autenticacion.js";
import { ErrorApp } from "../../../application/errores.js";

const esquemaLogin = z.object({
  correo: z.string({ error: "El correo es obligatorio" }).trim().min(1, "El correo es obligatorio").email("Correo inválido"),
  password: z.string({ error: "La contraseña es obligatoria" }).min(1, "La contraseña es obligatoria"),
});

/**
 * @param {ReturnType<typeof import("../../../application/autenticar.js").autenticar>} auth
 * @param {{registro?: Function, auditor?: {loginOk: Function, loginFallido: Function}}} [extras]
 *   `registro` (registro público) y `auditor` (bitácora de seguridad) son opcionales.
 */
export function rutasAuth(auth, { registro, auditor } = {}) {
  const router = Router();
  const autenticacion = crearAutenticacion(auth);

  // Express 5 propaga automáticamente los errores de handlers async.
  router.post("/login", async (req, res) => {
    const { correo, password } = esquemaLogin.parse(req.body ?? {});
    let resultado;
    try {
      resultado = await auth.login(correo, password);
    } catch (e) {
      if (e instanceof ErrorApp && e.codigo === "CREDENCIALES_INVALIDAS") {
        await auditor?.loginFallido({ correo, ip: req.ip });
      }
      throw e;
    }
    await auditor?.loginOk({ usuario: resultado.usuario, ip: req.ip });
    res.status(200).json(resultado);
  });

  if (registro) {
    router.post("/registro", async (req, res) => {
      res.status(201).json(await registro(req.body, req.ip));
    });
  }

  router.get("/me", autenticacion, (_req, res) => {
    // El middleware ya consultó al usuario vigente (sin password_hash).
    res.status(200).json({ usuario: res.locals.usuarioPublico });
  });

  return router;
}
