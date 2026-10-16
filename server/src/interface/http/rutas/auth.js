// Rutas de autenticación: POST /login y GET /me.
import { Router } from "express";
import { z } from "zod";
import { crearAutenticacion } from "../middlewares/autenticacion.js";

const esquemaLogin = z.object({
  correo: z.string({ error: "El correo es obligatorio" }).trim().min(1, "El correo es obligatorio").email("Correo inválido"),
  password: z.string({ error: "La contraseña es obligatoria" }).min(1, "La contraseña es obligatoria"),
});

/** @param {ReturnType<typeof import("../../../application/autenticar.js").autenticar>} auth */
export function rutasAuth(auth) {
  const router = Router();
  const autenticacion = crearAutenticacion(auth);

  // Express 5 propaga automáticamente los errores de handlers async.
  router.post("/login", async (req, res) => {
    const { correo, password } = esquemaLogin.parse(req.body ?? {});
    res.status(200).json(await auth.login(correo, password));
  });

  router.get("/me", autenticacion, (_req, res) => {
    // El middleware ya consultó al usuario vigente (sin password_hash).
    res.status(200).json({ usuario: res.locals.usuarioPublico });
  });

  return router;
}
