import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import * as favoritesApi from "../services/favoritesApi";

interface FavoritesState {
  products: string[];
  farms: string[];
  farmers: string[];
}

interface FavoritesContextValue extends FavoritesState {
  toggleProduct: (id: string) => void;
  toggleFarm: (id: string) => void;
  toggleFarmer: (id: string) => void;
  isProductFav: (id: string) => boolean;
  isFarmFav: (id: string) => boolean;
  isFarmerFav: (id: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);
const GUEST_STORAGE_KEY = "farmdirect_guest_favorites";

function readGuestFavorites(): FavoritesState {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { products: [], farms: [], farmers: [] };
  } catch {
    return { products: [], farms: [], farmers: [] };
  }
}

function writeGuestFavorites(state: FavoritesState) {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<FavoritesState>({ products: [], farms: [], farmers: [] });

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (user) {
        const favs = await favoritesApi.fetchFavorites().catch(() => null);
        setState({
          products: favs?.products.map((p) => p.id) ?? [],
          farms: favs?.farms.map((f) => f.id) ?? [],
          farmers: favs?.farmers.map((f) => f.id) ?? [],
        });
      } else {
        setState(readGuestFavorites());
      }
    })();
  }, [user, authLoading]);

  const toggle = async (key: keyof FavoritesState, id: string) => {
    const has = state[key].includes(id);
    const next: FavoritesState = { ...state, [key]: has ? state[key].filter((x) => x !== id) : [...state[key], id] };
    setState(next);

    if (user) {
      const apiKind = key === "products" ? "Product" : key === "farms" ? "Farm" : "Farmer";
      const fn = has
        ? favoritesApi[`unfavorite${apiKind}` as keyof typeof favoritesApi]
        : favoritesApi[`favorite${apiKind}` as keyof typeof favoritesApi];
      await (fn as (id: string) => Promise<void>)(id).catch(() => setState(state)); // revert on failure
    } else {
      writeGuestFavorites(next);
    }
  };

  const value = useMemo(
    () => ({
      ...state,
      toggleProduct: (id: string) => void toggle("products", id),
      toggleFarm: (id: string) => void toggle("farms", id),
      toggleFarmer: (id: string) => void toggle("farmers", id),
      isProductFav: (id: string) => state.products.includes(id),
      isFarmFav: (id: string) => state.farms.includes(id),
      isFarmerFav: (id: string) => state.farmers.includes(id),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, user]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
