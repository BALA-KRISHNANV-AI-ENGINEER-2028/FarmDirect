import { products as initialProducts } from "../data/products";
import { farms as initialFarms } from "../data/farms";
import { farmers as initialFarmers } from "../data/farmers";
import { orders as initialOrders, inventory as initialInventory } from "../data/orders";
import type { Product, Farm, Farmer, Order, InventoryItem } from "../types";

// In-memory state initialized with demo data
const mockProducts: Product[] = [...initialProducts];
const mockFarms: Farm[] = [...initialFarms];
const mockFarmers: Farmer[] = [...initialFarmers];
const mockOrders: Order[] = [...initialOrders];
const mockInventory: InventoryItem[] = [...initialInventory];

interface MockUser {
  id: string;
  email: string;
  role: "customer" | "farmer";
  fullName: string;
}

const STORAGE_USER_KEY = "farmdirect_current_user";

function getCurrentUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user: MockUser | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  } catch {
    // Ignore storage write issues
  }
}

const mockAddresses = [
  {
    id: "addr-1",
    label: "Home",
    fullName: "Priya Sharma",
    phone: "+91 98765 43210",
    addressLine: "204, Lotus Residency, Baner Road",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411045",
    isDefault: true,
  },
];

let mockPreferences = {
  orderUpdates: true,
  priceDrops: true,
  newHarvests: true,
  promotions: false,
  newOrderAlerts: true,
  lowStockAlerts: true,
  aiInsightUpdates: true,
  customerReviews: true,
};

let favoriteProductIds: string[] = ["p1", "p3"];
let favoriteFarmIds: string[] = ["farm1"];
let favoriteFarmerIds: string[] = ["f1"];

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function productToSummary(p: Product) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    unit: p.unit,
    image: p.images[0] ?? null,
    farmId: p.farmId,
    farmName: p.farmName,
    farmerName: p.farmerName,
    farmingMethod: p.farmingMethod,
    harvestDate: p.harvestDate,
    stock: p.stock,
    availability: p.availability,
    rating: p.rating,
    reviewCount: p.reviewCount,
  };
}

function productToDetail(p: Product) {
  return {
    ...productToSummary(p),
    images: p.images,
    description: p.description ?? null,
    reviews: (p.reviews ?? []).map((r) => ({
      id: r.id,
      customerName: r.author,
      rating: r.rating,
      comment: r.comment ?? null,
      createdAt: r.date,
    })),
  };
}

function farmToSummary(f: Farm) {
  return {
    id: f.id,
    name: f.name,
    farmerId: f.farmerId,
    farmerName: mockFarmers.find((m) => m.id === f.farmerId)?.name ?? "Farmer",
    image: f.image || null,
    category: f.category,
    farmingMethod: f.farmingMethod,
    sizeAcres: f.sizeAcres,
    yearsActive: f.yearsActive,
    verified: f.verified,
    addressLine: f.location,
    rating: f.rating,
    reviewCount: f.reviewCount,
    distanceKm: f.distanceMi,
    latitude: f.lat,
    longitude: f.lng,
  };
}

function farmToDetail(f: Farm) {
  return {
    ...farmToSummary(f),
    description: f.description ?? "",
    gallery: f.gallery && f.gallery.length ? f.gallery : [f.image],
  };
}

function farmerToProfile(fm: Farmer) {
  const farmerFarms = mockFarms.filter((f) => f.farmerId === fm.id || f.id === fm.farmId);
  return {
    id: fm.id,
    fullName: fm.name,
    avatarUrl: fm.photo || null,
    experienceYears: fm.experienceYears,
    verified: fm.verified,
    story: fm.story,
    rating: fm.rating,
    reviewCount: fm.reviewCount,
    farms: farmerFarms.map((f) => ({
      id: f.id,
      name: f.name,
      image: f.image || null,
      addressLine: f.location,
      verified: f.verified,
    })),
  };
}

export function handleMockRequest(
  pathWithQuery: string,
  method = "GET",
  body?: unknown
): Response | null {
  const [pathname, queryString] = pathWithQuery.split("?");
  const query = new URLSearchParams(queryString || "");
  const payload = (typeof body === "string" ? JSON.parse(body) : body) as Record<string, unknown> | undefined;

  // --- Auth endpoints ---
  if (pathname === "/auth/refresh") {
    const user = getCurrentUser();
    if (user) {
      return jsonResponse({ accessToken: "mock-token-" + Date.now() });
    }
    return jsonResponse({ error: { message: "Unauthenticated" } }, 401);
  }

  if (pathname === "/auth/login" && method === "POST") {
    const email = String(payload?.email || "guest@farmdirect.io");
    const isFarmer = email.toLowerCase().includes("farmer");
    const user: MockUser = {
      id: isFarmer ? "f1" : "u-guest",
      email,
      role: isFarmer ? "farmer" : "customer",
      fullName: isFarmer ? "Ravi Kumar" : "Priya Sharma",
    };
    setCurrentUser(user);
    return jsonResponse({
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: "mock-token-" + Date.now(),
    });
  }

  if (pathname === "/auth/register" && method === "POST") {
    const email = String(payload?.email || "user@farmdirect.io");
    const role = (payload?.role as "customer" | "farmer") || "customer";
    const fullName = String(payload?.fullName || "FarmDirect User");
    const user: MockUser = {
      id: "u-" + Date.now(),
      email,
      role,
      fullName,
    };
    setCurrentUser(user);
    return jsonResponse({
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: "mock-token-" + Date.now(),
    });
  }

  if (pathname === "/auth/logout") {
    setCurrentUser(null);
    return jsonResponse({ success: true });
  }

  if (pathname === "/auth/forgot-password" || pathname === "/auth/reset-password") {
    return jsonResponse({ message: "Success" });
  }

  if (pathname === "/auth/me") {
    const user = getCurrentUser() ?? {
      id: "u-guest",
      email: "guest@farmdirect.io",
      role: "customer" as const,
      fullName: "Guest User",
    };
    return jsonResponse({
      id: user.id,
      email: user.email,
      role: user.role,
      phone: "+91 98765 43210",
      createdAt: "2026-01-01T00:00:00Z",
      profile: {
        fullName: user.fullName,
        avatarUrl:
          user.role === "farmer"
            ? "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80"
            : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
        dateOfBirth: "1992-05-15",
        experienceYears: user.role === "farmer" ? 12 : undefined,
        story: user.role === "farmer" ? "Growing fresh organic produce with natural practices." : undefined,
      },
    });
  }

  if (pathname === "/auth/me" && method === "PUT") {
    const user = getCurrentUser();
    if (user && payload?.fullName) {
      user.fullName = String(payload.fullName);
      setCurrentUser(user);
    }
    return jsonResponse({ success: true });
  }

  // --- Products endpoints ---
  if (pathname === "/products" && method === "GET") {
    let list = [...mockProducts];
    const category = query.get("category");
    const search = query.get("search");
    const farmId = query.get("farmId");
    const sort = query.get("sort");

    if (category) {
      list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (farmId) {
      list = list.filter((p) => p.farmId === farmId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.farmName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (sort === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    }

    return jsonResponse({
      data: list.map(productToSummary),
      meta: { total: list.length },
    });
  }

  // Related products
  const relatedMatch = pathname.match(/^\/products\/([^/]+)\/related$/);
  if (relatedMatch) {
    const id = relatedMatch[1];
    const current = mockProducts.find((p) => p.id === id);
    const related = mockProducts
      .filter((p) => p.id !== id && (!current || p.category === current.category))
      .slice(0, 4);
    return jsonResponse({ data: related.map(productToSummary) });
  }

  // Product reviews
  const reviewMatch = pathname.match(/^\/products\/([^/]+)\/reviews$/);
  if (reviewMatch && method === "POST") {
    const id = reviewMatch[1];
    const p = mockProducts.find((item) => item.id === id);
    if (p) {
      const newReview = {
        id: "r-" + Date.now(),
        author: getCurrentUser()?.fullName || "Customer",
        rating: Number(payload?.rating || 5),
        date: new Date().toISOString().slice(0, 10),
        comment: String(payload?.comment || ""),
      };
      p.reviews = [newReview, ...(p.reviews || [])];
      p.reviewCount = (p.reviewCount || 0) + 1;
    }
    return jsonResponse({ success: true });
  }

  // Single product detail
  const singleProductMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (singleProductMatch) {
    const id = singleProductMatch[1];
    if (method === "GET") {
      const p = mockProducts.find((item) => item.id === id) ?? mockProducts[0];
      return jsonResponse({ product: productToDetail(p) });
    }
    if (method === "PUT") {
      const idx = mockProducts.findIndex((item) => item.id === id);
      if (idx !== -1 && payload) {
        mockProducts[idx] = { ...mockProducts[idx], ...payload } as Product;
        return jsonResponse({ product: productToDetail(mockProducts[idx]) });
      }
    }
    if (method === "DELETE") {
      const idx = mockProducts.findIndex((item) => item.id === id);
      if (idx !== -1) mockProducts.splice(idx, 1);
      return new Response(null, { status: 204 });
    }
  }

  if (pathname === "/products" && method === "POST") {
    const newId = "p-" + Date.now();
    const newProduct: Product = {
      id: newId,
      name: String(payload?.name || "Fresh Produce"),
      category: (payload?.category as Product["category"]) || "Vegetables",
      price: Number(payload?.price || 50),
      unit: String(payload?.unit || "kg"),
      images: Array.isArray(payload?.images) && payload.images.length
        ? (payload.images as string[])
        : ["https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80"],
      farmId: String(payload?.farmId || "farm1"),
      farmerId: "f1",
      farmName: "Ravi's Organic Farm",
      farmerName: "Ravi Kumar",
      distanceMi: 2.5,
      harvestDate: String(payload?.harvestDate || new Date().toISOString().slice(0, 10)),
      farmingMethod: (payload?.farmingMethod as Product["farmingMethod"]) || "Organic",
      stock: Number(payload?.stock || 50),
      availability: "In Stock",
      rating: 5.0,
      reviewCount: 0,
      description: String(payload?.description || ""),
      harvestedToday: true,
      reviews: [],
    };
    mockProducts.unshift(newProduct);
    return jsonResponse({ product: productToDetail(newProduct) });
  }

  // --- Farms endpoints ---
  if (pathname === "/farms" && method === "GET") {
    let list = [...mockFarms];
    const category = query.get("category");
    const verified = query.get("verified_only");
    const search = query.get("search");

    if (category) {
      list = list.filter((f) => f.category.toLowerCase() === category.toLowerCase());
    }
    if (verified === "true") {
      list = list.filter((f) => f.verified);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.location.toLowerCase().includes(q));
    }
    return jsonResponse({
      data: list.map(farmToSummary),
      meta: { total: list.length },
    });
  }

  if (pathname === "/farms/nearby" || pathname === "/farms/mine") {
    return jsonResponse({
      data: mockFarms.map(farmToSummary),
      meta: { total: mockFarms.length },
    });
  }

  const farmDetailMatch = pathname.match(/^\/farms\/([^/]+)$/);
  if (farmDetailMatch) {
    const id = farmDetailMatch[1];
    const f = mockFarms.find((item) => item.id === id) ?? mockFarms[0];
    return jsonResponse({ farm: farmToDetail(f) });
  }

  if (pathname === "/farms" && method === "POST") {
    const newFarm: Farm = {
      id: "farm-" + Date.now(),
      name: String(payload?.name || "Green Valley Farm"),
      farmerId: "f1",
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80",
      gallery: ["https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80"],
      location: String(payload?.addressLine || "Nashik, Maharashtra"),
      distanceMi: 3.2,
      lat: Number(payload?.latitude || 18.5204),
      lng: Number(payload?.longitude || 73.8567),
      sizeAcres: Number(payload?.sizeAcres || 10),
      farmingMethod: (payload?.farmingMethod as Farm["farmingMethod"]) || "Organic",
      yearsActive: Number(payload?.yearsActive || 5),
      verified: true,
      rating: 4.9,
      reviewCount: 12,
      currentCrops: ["Tomatoes", "Kale"],
      category: (payload?.category as Farm["category"]) || "Vegetables",
      description: String(payload?.description || "Family-run local organic farm."),
    };
    mockFarms.unshift(newFarm);
    return jsonResponse({ farm: farmToDetail(newFarm) });
  }

  // --- Farmers endpoints ---
  const farmerMatch = pathname.match(/^\/farmers\/([^/]+)$/);
  if (farmerMatch) {
    const id = farmerMatch[1];
    const fm = mockFarmers.find((item) => item.id === id) ?? mockFarmers[0];
    return jsonResponse({ farmer: farmerToProfile(fm) });
  }

  // --- Orders endpoints ---
  if (pathname === "/orders" && method === "GET") {
    return jsonResponse({ data: mockOrders });
  }

  if (pathname === "/farmer/orders" && method === "GET") {
    return jsonResponse({ data: mockOrders });
  }

  const singleOrderMatch = pathname.match(/^\/orders\/([^/]+)$/);
  if (singleOrderMatch && method === "GET") {
    const id = singleOrderMatch[1];
    const o = mockOrders.find((item) => item.id === id || item.orderNumber === id) ?? mockOrders[0];
    return jsonResponse({ order: o });
  }

  const orderStatusMatch = pathname.match(/^\/orders\/([^/]+)\/status$/);
  if (orderStatusMatch && method === "PUT") {
    const id = orderStatusMatch[1];
    const o = mockOrders.find((item) => item.id === id || item.orderNumber === id);
    if (o && payload?.status) {
      o.status = payload.status as Order["status"];
      o.farmerOrderStatus = payload.status as Order["farmerOrderStatus"];
    }
    return jsonResponse({ order: o ?? mockOrders[0] });
  }

  if (pathname === "/orders" && method === "POST") {
    const newOrder: Order = {
      id: "FD-" + Math.floor(1000 + Math.random() * 9000),
      orderNumber: "FD-" + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().slice(0, 10),
      status: "CONFIRMED",
      farmerOrderStatus: "New",
      items: [
        {
          productId: "p1",
          name: "Heirloom Tomatoes",
          image: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=200&q=80",
          quantity: 2,
          unit: "kg",
          price: 38,
          farmId: "farm1",
          farmName: "Ravi's Organic Farm",
        },
      ],
      total: 76,
      deliveryAddress: "204, Lotus Residency, Baner Road, Pune",
      estimatedDelivery: "Tomorrow, 10:00 AM – 1:00 PM",
    };
    mockOrders.unshift(newOrder);
    return jsonResponse({ order: newOrder });
  }

  // --- Inventory endpoints ---
  if (pathname === "/inventory" && method === "GET") {
    return jsonResponse({
      data: mockInventory.map((i) => ({
        productId: i.productId,
        name: i.name,
        image: i.image,
        farmId: "farm1",
        farmName: "Ravi's Organic Farm",
        stock: i.stock,
        unit: i.unit,
        status: i.status,
        harvestDate: i.harvestDate,
        lastMovement: {
          change: -5,
          reason: "sale",
          note: i.lastMovement,
          at: new Date().toISOString(),
        },
      })),
    });
  }

  const inventoryAdjustMatch = pathname.match(/^\/inventory\/([^/]+)\/adjust$/);
  if (inventoryAdjustMatch && method === "POST") {
    const id = inventoryAdjustMatch[1];
    const item = mockInventory.find((i) => i.productId === id);
    const change = Number(payload?.change || 0);
    if (item) {
      item.stock = Math.max(0, item.stock + change);
      item.status = item.stock === 0 ? "Out of Stock" : item.stock < 10 ? "Low Stock" : "In Stock";
    }
    return jsonResponse({
      data: {
        productId: id,
        stock: item ? item.stock : 50,
        availability: item ? item.status : "In Stock",
      },
    });
  }

  // --- Favorites endpoints ---
  if (pathname === "/favorites" && method === "GET") {
    const favProducts = mockProducts
      .filter((p) => favoriteProductIds.includes(p.id))
      .map(productToSummary);
    const favFarms = mockFarms
      .filter((f) => favoriteFarmIds.includes(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        image: f.image || null,
        addressLine: f.location,
        verified: f.verified,
      }));
    const favFarmers = mockFarmers
      .filter((fm) => favoriteFarmerIds.includes(fm.id))
      .map((fm) => ({
        id: fm.id,
        fullName: fm.name,
        avatarUrl: fm.photo || null,
        verified: fm.verified,
      }));
    return jsonResponse({
      products: favProducts,
      farms: favFarms,
      farmers: favFarmers,
    });
  }

  if (pathname.startsWith("/favorites/products/")) {
    const id = pathname.replace("/favorites/products/", "");
    if (method === "POST") favoriteProductIds.push(id);
    else favoriteProductIds = favoriteProductIds.filter((x) => x !== id);
    return new Response(null, { status: 204 });
  }

  if (pathname.startsWith("/favorites/farms/")) {
    const id = pathname.replace("/favorites/farms/", "");
    if (method === "POST") favoriteFarmIds.push(id);
    else favoriteFarmIds = favoriteFarmIds.filter((x) => x !== id);
    return new Response(null, { status: 204 });
  }

  if (pathname.startsWith("/favorites/farmers/")) {
    const id = pathname.replace("/favorites/farmers/", "");
    if (method === "POST") favoriteFarmerIds.push(id);
    else favoriteFarmerIds = favoriteFarmerIds.filter((x) => x !== id);
    return new Response(null, { status: 204 });
  }

  // --- Addresses endpoints ---
  if (pathname === "/addresses" && method === "GET") {
    return jsonResponse({ data: mockAddresses });
  }

  if (pathname === "/addresses" && method === "POST") {
    const newAddr = {
      id: "addr-" + Date.now(),
      label: String(payload?.label || "Home"),
      fullName: String(payload?.fullName || "Priya Sharma"),
      phone: String(payload?.phone || "+91 98765 43210"),
      addressLine: String(payload?.addressLine || "204, Lotus Residency"),
      city: String(payload?.city || "Pune"),
      state: String(payload?.state || "Maharashtra"),
      postalCode: String(payload?.postalCode || "411045"),
      isDefault: Boolean(payload?.isDefault),
    };
    mockAddresses.push(newAddr);
    return jsonResponse({ address: newAddr });
  }

  // --- Notification Preferences ---
  if (pathname === "/notifications/preferences") {
    if (method === "PUT" && payload) {
      mockPreferences = { ...mockPreferences, ...payload };
    }
    return jsonResponse({ preferences: mockPreferences });
  }

  // Fallback for generic success
  return jsonResponse({ success: true });
}
