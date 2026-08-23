import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validateBody } from "../middleware/validate";
import { updatePreferencesSchema } from "../validation/notification.schemas";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get("/", notificationController.getNotifications);
notificationRouter.put(
  "/preferences",
  validateBody(updatePreferencesSchema),
  notificationController.updatePreferences
);
