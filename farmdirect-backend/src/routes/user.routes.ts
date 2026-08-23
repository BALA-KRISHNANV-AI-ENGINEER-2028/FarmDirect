import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validateBody } from "../middleware/validate";
import { updateProfileSchema } from "../validation/user.schemas";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/me", userController.getMe);
userRouter.put("/me", validateBody(updateProfileSchema), userController.updateMe);
