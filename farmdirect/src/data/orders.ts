import type { Order, InventoryItem, AIInsight } from "../types";

export const orders: Order[] = [
  {
    id: "FD-8924", orderNumber: "FD-8924",
    date: "2026-08-10",
    status: "OUT_FOR_DELIVERY",
    items: [
      { productId: "p1", name: "Heirloom Tomatoes", image: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=200&q=80", quantity: 2, unit: "kg", price: 38, farmId: "farm1", farmName: "Ravi's Organic Farm" },
      { productId: "p2", name: "Dinosaur Kale", image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=200&q=80", quantity: 1, unit: "bunch", price: 45, farmId: "farm1", farmName: "Ravi's Organic Farm" },
    ],
    total: 121,
    deliveryAddress: "204, Lotus Residency, Baner Road, Pune",
    estimatedDelivery: "Today, 4:00 PM – 6:00 PM",
  },
  {
    id: "FD-8901", orderNumber: "FD-8901",
    date: "2026-08-05",
    status: "DELIVERED",
    items: [
      { productId: "p4", name: "Vine Tomatoes", image: "https://images.unsplash.com/photo-1561136594-7f68413baa99?w=200&q=80", quantity: 3, unit: "kg", price: 34, farmId: "farm3", farmName: "Sunrise Valley Farm" },
    ],
    total: 102,
    deliveryAddress: "204, Lotus Residency, Baner Road, Pune",
    estimatedDelivery: "Delivered Aug 5, 5:12 PM",
  },
  {
    id: "FD-8877", orderNumber: "FD-8877",
    date: "2026-07-29",
    status: "DELIVERED",
    items: [
      { productId: "p10", name: "Roasted Groundnuts", image: "https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=200&q=80", quantity: 1, unit: "kg", price: 60, farmId: "farm4", farmName: "Miller's Field" },
      { productId: "p3", name: "Organic Baby Spinach", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&q=80", quantity: 2, unit: "bunch", price: 30, farmId: "farm2", farmName: "Green Acres" },
    ],
    total: 120,
    deliveryAddress: "204, Lotus Residency, Baner Road, Pune",
    estimatedDelivery: "Delivered Jul 29, 3:40 PM",
  },
];

export const inventory: InventoryItem[] = [
  { productId: "p1", name: "Heirloom Tomatoes", image: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=200&q=80", stock: 120, unit: "kg", status: "In Stock", harvestDate: "2026-08-10", lastMovement: "-8 kg sold, 2h ago" },
  { productId: "p2", name: "Dinosaur Kale", image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=200&q=80", stock: 40, unit: "bunch", status: "In Stock", harvestDate: "2026-08-09", lastMovement: "-3 bunch sold, 5h ago" },
  { productId: "p6", name: "Purple Brinjal", image: "https://images.unsplash.com/photo-1613743983303-b3e89f8a2b80?w=200&q=80", stock: 65, unit: "kg", status: "In Stock", harvestDate: "2026-08-09", lastMovement: "+65 kg harvested, 1d ago" },
  { productId: "p9", name: "Purple Eggplants", image: "https://images.unsplash.com/photo-1600231615692-4d0e2a8b8daf?w=200&q=80", stock: 3, unit: "kg", status: "Low Stock", harvestDate: "2026-08-07", lastMovement: "-12 kg sold, 3h ago" },
];

export const aiInsights: AIInsight[] = [
  {
    id: "i1",
    type: "demand",
    title: "Demand Forecast",
    message: "Tomato demand is expected to increase 22% this week due to the upcoming festival season.",
    icon: "trending_up",
  },
  {
    id: "i2",
    type: "price",
    title: "Price Recommendation",
    message: "Recommended tomato selling price: ₹34–₹38/kg based on nearby market rates.",
    icon: "payments",
  },
  {
    id: "i3",
    type: "inventory",
    title: "Inventory Alert",
    message: "Your spinach inventory may sell out within 2 days at the current order rate.",
    icon: "warning",
  },
  {
    id: "i4",
    type: "sales",
    title: "Sales Insight",
    message: "Tomatoes generated 38% of your revenue this month — consider expanding this crop next season.",
    icon: "insights",
  },
];

export const revenueTrend = [
  { day: "Mon", revenue: 4200 },
  { day: "Tue", revenue: 5100 },
  { day: "Wed", revenue: 3800 },
  { day: "Thu", revenue: 6200 },
  { day: "Fri", revenue: 7400 },
  { day: "Sat", revenue: 8900 },
  { day: "Sun", revenue: 6600 },
];

export const bestSellers = [
  { name: "Heirloom Tomatoes", unitsSold: 340, revenue: 12920 },
  { name: "Green Bell Peppers", unitsSold: 210, revenue: 8820 },
  { name: "Dinosaur Kale", unitsSold: 180, revenue: 8100 },
  { name: "Purple Eggplants", unitsSold: 140, revenue: 4480 },
];
