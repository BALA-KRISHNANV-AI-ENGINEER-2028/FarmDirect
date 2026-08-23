import {
  clearCart as clearCartModel,
  deleteCartItem,
  listCartItemsByCustomerId,
  setCartItemQuantity,
  upsertCartItem,
} from "../models/cartItem.model";
import { findProductById } from "../models/product.model";
import { HttpError } from "../utils/httpError";

function toCartItemDto(row: Awaited<ReturnType<typeof listCartItemsByCustomerId>>[number]) {
  return {
    productId: row.product_id,
    name: row.product_name,
    image: row.product_image,
    price: Number(row.price),
    unit: row.unit,
    quantity: row.quantity,
    farmId: row.farm_id,
    farmName: row.farm_name,
    availability: row.availability,
    stock: row.stock,
  };
}

export async function getCart(customerId: string) {
  const rows = await listCartItemsByCustomerId(customerId);
  const items = rows.map(toCartItemDto);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { items, subtotal, totalItems: items.reduce((sum, i) => sum + i.quantity, 0) };
}

export async function addToCart(customerId: string, productId: string, quantity: number) {
  const product = await findProductById(productId);
  if (!product) throw HttpError.notFound("Product not found");
  if (product.availability === "Out of Stock") {
    throw HttpError.conflict(`${product.name} is currently out of stock.`);
  }
  await upsertCartItem(customerId, productId, quantity);
  return getCart(customerId);
}

export async function updateCartItemQuantity(customerId: string, productId: string, quantity: number) {
  const updated = await setCartItemQuantity(customerId, productId, quantity);
  if (!updated) throw HttpError.notFound("This product isn't in your cart.");
  return getCart(customerId);
}

export async function removeFromCart(customerId: string, productId: string) {
  await deleteCartItem(customerId, productId);
  return getCart(customerId);
}

export async function clearCart(customerId: string) {
  await clearCartModel(customerId);
}
