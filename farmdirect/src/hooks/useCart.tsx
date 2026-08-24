import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import * as cartApi from "../services/cartApi";
import { fetchProduct } from "../services/productsApi";
import { useToast } from "../components/ui/Toast";
import { getErrorMessage } from "../services/apiClient";

export interface EnrichedCartItem {
  productId: string;
  quantity: number;
  name: string;
  image: string;
  price: number;
  unit: string;
  farmId: string;
  farmName: string;
  availability: string;
  stock: number;
}

interface CartContextValue {
  items: EnrichedCartItem[];
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
  loading: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const GUEST_STORAGE_KEY = "farmdirect_guest_cart";

function readGuestQuantities(): Record<string, number> {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeGuestQuantities(quantities: Record<string, number>) {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(quantities));
}

function fromApiCart(cart: cartApi.ApiCart): EnrichedCartItem[] {
  return cart.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    name: i.name,
    image: i.image ?? "",
    price: i.price,
    unit: i.unit,
    farmId: i.farmId,
    farmName: i.farmName,
    availability: i.availability,
    stock: i.stock,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<EnrichedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Guests: resolve product details for whatever's in localStorage so the
  // cart page can render name/price/image without needing mock data.
  async function hydrateGuestCart() {
    const quantities = readGuestQuantities();
    const ids = Object.keys(quantities);
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    const products = await Promise.all(ids.map((id) => fetchProduct(id).catch(() => null)));
    setItems(
      products
        .map((p, i) => (p ? { ...p, quantity: quantities[ids[i]] } : null))
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .map((p) => ({
          productId: p.id,
          quantity: p.quantity,
          name: p.name,
          image: p.images[0] ?? "",
          price: p.price,
          unit: p.unit,
          farmId: p.farmId,
          farmName: p.farmName,
          availability: p.availability,
          stock: p.stock,
        }))
    );
  }

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    (async () => {
      if (user) {
        const cart = await cartApi.fetchCart().catch(() => ({ items: [], subtotal: 0, totalItems: 0 }));
        setItems(fromApiCart(cart));
      } else {
        await hydrateGuestCart();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const removeItem = async (productId: string) => {
    try {
      if (user) {
        const cart = await cartApi.removeCartItem(productId);
        setItems(fromApiCart(cart));
      } else {
        const quantities = readGuestQuantities();
        delete quantities[productId];
        writeGuestQuantities(quantities);
        await hydrateGuestCart();
      }
      showToast("Item removed from basket", "info");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  const addItem = async (productId: string, quantity = 1) => {
    try {
      if (user) {
        const cart = await cartApi.addCartItem(productId, quantity);
        setItems(fromApiCart(cart));
      } else {
        const quantities = readGuestQuantities();
        quantities[productId] = (quantities[productId] ?? 0) + quantity;
        writeGuestQuantities(quantities);
        await hydrateGuestCart();
      }
      showToast("Item added to basket!", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }
    try {
      if (user) {
        const cart = await cartApi.updateCartItem(productId, quantity);
        setItems(fromApiCart(cart));
      } else {
        const quantities = readGuestQuantities();
        quantities[productId] = quantity;
        writeGuestQuantities(quantities);
        await hydrateGuestCart();
      }
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  const clearCart = async () => {
    if (user) {
      await cartApi.clearCartApi();
    } else {
      writeGuestQuantities({});
    }
    setItems([]);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, loading }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, totalItems, subtotal, loading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
