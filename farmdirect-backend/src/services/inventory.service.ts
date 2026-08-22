import { withTransaction } from "../config/database";
import {
  getLatestMovementsByProductIds,
  insertInventoryMovement,
  listMovementsByProductId,
} from "../models/inventoryMovement.model";
import { applyStockChange, findProductOwnerId, listProductsByFarmerId } from "../models/product.model";
import { getPrimaryImagesByProductIds } from "../models/productImage.model";
import { HttpError } from "../utils/httpError";
import type { Pagination } from "../utils/pagination";

/** GET /api/inventory — every product across every farm this farmer owns, with its most recent movement. */
export async function getInventory(farmerId: string) {
  const products = await listProductsByFarmerId(farmerId);
  const productIds = products.map((p) => p.id);
  const [images, latestMovements] = await Promise.all([
    getPrimaryImagesByProductIds(productIds),
    getLatestMovementsByProductIds(productIds),
  ]);

  return products.map((p) => {
    const movement = latestMovements[p.id];
    return {
      productId: p.id,
      name: p.name,
      image: images[p.id] ?? null,
      farmId: p.farm_id,
      farmName: p.farm_name,
      stock: p.stock,
      unit: p.unit,
      status: p.availability,
      harvestDate: p.harvest_date,
      lastMovement: movement
        ? { change: movement.change, reason: movement.reason, note: movement.note, at: movement.created_at }
        : null,
    };
  });
}

export async function getProductMovementHistory(farmerId: string, productId: string, pagination: Pagination) {
  const ownerId = await findProductOwnerId(productId);
  if (!ownerId) throw HttpError.notFound("Product not found");
  if (ownerId !== farmerId) throw HttpError.forbidden("You don't have permission to view this product's inventory.");

  const { rows, total } = await listMovementsByProductId(productId, pagination.limit, pagination.offset);
  return { data: rows, total };
}

export interface AdjustInventoryInput {
  change: number;
  reason: string;
  note?: string;
}

/**
 * Applies a stock delta and appends a ledger row atomically. Rejects with a
 * clean 409 (not a raw DB constraint-violation error) if the change would
 * push stock negative — the `products.stock >= 0` CHECK constraint is the
 * last line of defense, but callers should never see that far.
 */
export async function adjustInventory(farmerId: string, productId: string, input: AdjustInventoryInput) {
  const ownerId = await findProductOwnerId(productId);
  if (!ownerId) throw HttpError.notFound("Product not found");
  if (ownerId !== farmerId) throw HttpError.forbidden("You don't have permission to adjust this product's inventory.");

  return withTransaction(async (client) => {
    const result = await applyStockChange(productId, input.change, client);
    if (!result) {
      // findProductOwnerId already confirmed this product exists (above),
      // so a null result here can only mean the WHERE guard in
      // applyStockChange blocked a change that would take stock negative —
      // not a missing product. Reported as a conflict, not a 404.
      throw HttpError.conflict(
        `This adjustment would leave stock below zero. Current stock isn't enough for a change of ${input.change}.`
      );
    }

    await insertInventoryMovement(
      { productId, change: input.change, reason: input.reason, note: input.note },
      client
    );

    return { productId, stock: result.stock, availability: result.availability };
  });
}
