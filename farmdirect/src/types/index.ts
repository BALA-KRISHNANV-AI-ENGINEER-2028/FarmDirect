export type Category =
  | "Vegetables"
  | "Fruits"
  | "Grains"
  | "Spices"
  | "Dairy"
  | "Nuts & Oils";

export type FarmingMethod = "Organic" | "Natural Farming" | "Conventional" | "Pesticide-Free";

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Farmer {
  id: string;
  name: string;
  photo: string;
  farmId: string;
  farmName: string;
  experienceYears: number;
  location: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  story: string;
  productIds: string[];
}

export interface Farm {
  id: string;
  name: string;
  farmerId: string;
  image: string;
  gallery: string[];
  location: string;
  distanceMi: number;
  lat: number;
  lng: number;
  sizeAcres: number;
  farmingMethod: FarmingMethod;
  yearsActive: number;
  verified: boolean;
  rating: number;
  reviewCount: number;
  currentCrops: string[];
  category: Category;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  unit: string;
  images: string[];
  farmId: string;
  farmerId: string;
  farmName: string;
  farmerName: string;
  distanceMi: number;
  harvestDate: string;
  farmingMethod: FarmingMethod;
  stock: number;
  availability: "In Stock" | "Low Stock" | "Out of Stock";
  rating: number;
  reviewCount: number;
  description: string;
  harvestedToday?: boolean;
  reviews: Review[];
}

/**
 * Matches the backend's canonical order_status enum exactly (decision #2) —
 * PENDING through DELIVERED, with CANCELLED as a terminal branch. This
 * replaces the original mock's 7-label list (which had "Harvested" and
 * "Picked Up" as separate steps that don't exist in the real backend
 * lifecycle) — flagged as a known gap back in the backend's Phase B and
 * resolved here during frontend integration.
 */
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unit: string;
  price: number;
  farmId: string;
  farmName: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  deliveryAddress: string;
  estimatedDelivery: string;
  farmerOrderStatus?: FarmerOrderStatus;
}

export type FarmerOrderStatus =
  | "New"
  | "Accepted"
  | "Preparing"
  | "Ready for Pickup"
  | "Completed"
  | "Cancelled";

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface InventoryItem {
  productId: string;
  name: string;
  image: string;
  stock: number;
  unit: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  harvestDate: string;
  lastMovement: string;
}

export interface AIInsight {
  id: string;
  type: "demand" | "price" | "inventory" | "sales";
  title: string;
  message: string;
  icon: string;
}
