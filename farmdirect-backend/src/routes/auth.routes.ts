import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authRateLimiter } from "../middleware/rateLimiter";
import { validateBody } from "../middleware/validate";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validation/auth.schemas";

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post("/register", validateBody(registerSchema), authController.register);
authRouter.post("/login", validateBody(loginSchema), authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.post("/forgot-password", validateBody(forgotPasswordSchema), authController.forgotPassword);
authRouter.post("/reset-password", validateBody(resetPasswordSchema), authController.resetPassword);

authRouter.get("/google", authController.googleAuth);
authRouter.get("/google/callback", authController.googleCallback);
authRouter.post("/google", authController.googleTokenAuth);
