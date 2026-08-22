import { Router } from "express";
import * as favoriteController from "../controllers/favorite.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

export const favoriteRouter = Router();

favoriteRouter.use(requireAuth, requireRole("customer"));

favoriteRouter.get("/", favoriteController.getFavorites);

favoriteRouter.post("/products/:id", favoriteController.addProductFavorite);
favoriteRouter.delete("/products/:id", favoriteController.removeProductFavorite);

favoriteRouter.post("/farms/:id", favoriteController.addFarmFavorite);
favoriteRouter.delete("/farms/:id", favoriteController.removeFarmFavorite);

favoriteRouter.post("/farmers/:id", favoriteController.addFarmerFavorite);
favoriteRouter.delete("/farmers/:id", favoriteController.removeFarmerFavorite);
