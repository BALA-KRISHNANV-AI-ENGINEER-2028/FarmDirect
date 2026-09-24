import type { PoolClient } from "pg";
import { pool } from "../config/database";

const db = (client?: PoolClient) => client ?? pool;

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrdersTrendPoint {
  date: string;
  orders: number;
}

export interface BestSellerProduct {
  id: string;
  name: string;
  category?: string;
  unitsSold: number;
  revenue: number;
}

export interface PeriodInfo {
  from: string;
  to: string;
  label: string;
  periodKey: "7d" | "30d" | "90d" | "year";
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export interface OrderStatusPoint {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AttentionItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  threshold: number;
  status: string;
  farmName?: string;
}

export interface InventorySummary {
  healthyStock: number;
  lowStock: number;
  outOfStock: number;
  totalStockUnits: number;
  itemsRequiringAttention: AttentionItem[];
}

export interface CustomerSummary {
  total: number;
  new: number;
  repeat: number;
  repeatRate: number;
}

export interface CategoryPerformancePoint {
  category: string;
  revenue: number;
  unitsSold: number;
  productsCount: number;
}

export interface RecentOrderPoint {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  amount: number;
  status: string;
  itemsCount: number;
}

export interface FarmerAnalyticsSummary {
  period: PeriodInfo;
  summary: AnalyticsSummary;
  revenueTrend: RevenueTrendPoint[];
  ordersTrend: OrdersTrendPoint[];
  topProducts: BestSellerProduct[];
  orderStatusDistribution: OrderStatusPoint[];
  inventorySummary: InventorySummary;
  customerSummary: CustomerSummary;
  categoryPerformance: CategoryPerformancePoint[];
  recentOrders: RecentOrderPoint[];

  // Backwards-compatible legacy fields
  revenue30d: number;
  revenueTrendPercent: number;
  orders30d: number;
  ordersTrendPercent: number;
  productsSold: number;
  productsSoldTrendPercent: number;
  newCustomers: number;
  newCustomersTrendPercent: number;
  bestSellers: BestSellerProduct[];
  performance: {
    repeatPurchaseRate: number;
    averageOrderValue: number;
    customerGrowthRate: number;
    averageRating: number;
  };
}

export async function computeFarmerAnalytics(
  farmerId: string,
  periodParam: string = "30d",
  client?: PoolClient
): Promise<FarmerAnalyticsSummary> {
  const conn = db(client);

  let days = 30;
  let label = "Last 30 days";
  let periodKey: "7d" | "30d" | "90d" | "year" = "30d";

  if (periodParam === "7d") {
    days = 7;
    label = "Last 7 days";
    periodKey = "7d";
  } else if (periodParam === "90d") {
    days = 90;
    label = "Last 90 days";
    periodKey = "90d";
  } else if (periodParam === "year") {
    days = 365;
    label = "This year";
    periodKey = "year";
  }

  const now = new Date();
  const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const periodInfo: PeriodInfo = {
    from: fromDate.toISOString(),
    to: now.toISOString(),
    label,
    periodKey,
  };

  const daysParam = String(days);

  // 1. Current period sales & order summary
  const summaryRes = await conn.query<{
    total_revenue: string;
    total_orders: string;
    completed_orders: string;
    pending_orders: string;
    processing_orders: string;
    cancelled_orders: string;
    units_sold: string;
    customer_count: string;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN oi.price_snapshot * oi.quantity ELSE 0 END), 0) AS total_revenue,
       COUNT(DISTINCT o.id) AS total_orders,
       COUNT(DISTINCT CASE WHEN o.status = 'DELIVERED' THEN o.id END) AS completed_orders,
       COUNT(DISTINCT CASE WHEN o.status = 'PENDING' THEN o.id END) AS pending_orders,
       COUNT(DISTINCT CASE WHEN o.status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY') THEN o.id END) AS processing_orders,
       COUNT(DISTINCT CASE WHEN o.status = 'CANCELLED' THEN o.id END) AS cancelled_orders,
       COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN oi.quantity ELSE 0 END), 0) AS units_sold,
       COUNT(DISTINCT CASE WHEN o.status != 'CANCELLED' THEN o.customer_id END) AS customer_count
     FROM order_items oi
     JOIN farms f ON f.id = oi.farm_id
     JOIN orders o ON o.id = oi.order_id
     WHERE f.farmer_id = $1
       AND o.placed_at >= NOW() - ($2 || ' days')::interval`,
    [farmerId, daysParam]
  );

  const sRow = summaryRes.rows[0];
  const totalRevenue = Number(sRow?.total_revenue ?? 0);
  const totalOrders = parseInt(sRow?.total_orders ?? "0", 10);
  const completedOrders = parseInt(sRow?.completed_orders ?? "0", 10);
  const pendingOrders = parseInt(sRow?.pending_orders ?? "0", 10);
  const processingOrders = parseInt(sRow?.processing_orders ?? "0", 10);
  const cancelledOrders = parseInt(sRow?.cancelled_orders ?? "0", 10);
  const unitsSold = Number(sRow?.units_sold ?? 0);

  // 2. Previous equivalent period overview (for trend/growth calculation)
  const prevOverviewRes = await conn.query<{
    prev_revenue: string;
    prev_orders: string;
    prev_units: string;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN oi.price_snapshot * oi.quantity ELSE 0 END), 0) AS prev_revenue,
       COUNT(DISTINCT o.id) AS prev_orders,
       COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN oi.quantity ELSE 0 END), 0) AS prev_units
     FROM order_items oi
     JOIN farms f ON f.id = oi.farm_id
     JOIN orders o ON o.id = oi.order_id
     WHERE f.farmer_id = $1
       AND o.placed_at >= NOW() - ($2 || ' days')::interval - ($2 || ' days')::interval
       AND o.placed_at < NOW() - ($2 || ' days')::interval`,
    [farmerId, daysParam]
  );

  const prevRow = prevOverviewRes.rows[0];
  const prevRevenue = Number(prevRow?.prev_revenue ?? 0);
  const prevOrders = parseInt(prevRow?.prev_orders ?? "0", 10);
  const prevUnits = Number(prevRow?.prev_units ?? 0);

  const calcTrend = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  const revenueGrowth = calcTrend(totalRevenue, prevRevenue);
  const ordersGrowth = calcTrend(totalOrders, prevOrders);
  const productsSoldTrend = calcTrend(unitsSold, prevUnits);

  // 3. Products count & inventory health from the farmer's catalogue
  const productsRes = await conn.query<{
    id: string;
    name: string;
    category: string | null;
    stock: number;
    unit: string;
    low_stock_threshold: number;
    availability: string;
    is_active: boolean;
    farm_name: string;
  }>(
    `SELECT
       p.id,
       p.name,
       p.category::text,
       p.stock,
       p.unit,
       p.low_stock_threshold,
       p.availability::text,
       p.is_active,
       f.name AS farm_name
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     WHERE f.farmer_id = $1
     ORDER BY p.stock ASC`,
    [farmerId]
  );

  const allProducts = productsRes.rows;
  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter((p) => p.is_active).length;

  let healthyStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalStockUnits = 0;
  const itemsRequiringAttention: AttentionItem[] = [];

  for (const p of allProducts) {
    totalStockUnits += p.stock;
    const isOut = p.stock === 0 || p.availability === "Out of Stock";
    const isLow = !isOut && (p.stock <= p.low_stock_threshold || p.availability === "Low Stock");

    if (isOut) {
      outOfStock++;
      itemsRequiringAttention.push({
        id: p.id,
        name: p.name,
        stock: p.stock,
        unit: p.unit,
        threshold: p.low_stock_threshold,
        status: "Out of Stock",
        farmName: p.farm_name,
      });
    } else if (isLow) {
      lowStock++;
      itemsRequiringAttention.push({
        id: p.id,
        name: p.name,
        stock: p.stock,
        unit: p.unit,
        threshold: p.low_stock_threshold,
        status: "Low Stock",
        farmName: p.farm_name,
      });
    } else {
      healthyStock++;
    }
  }

  const inventorySummary: InventorySummary = {
    healthyStock,
    lowStock,
    outOfStock,
    totalStockUnits,
    itemsRequiringAttention: itemsRequiringAttention.slice(0, 8),
  };

  // 4. Daily revenue and orders trends
  const trendRes = await conn.query<{
    day: string;
    revenue: string;
    order_count: string;
  }>(
    `SELECT
       to_char(o.placed_at, 'YYYY-MM-DD') AS day,
       COALESCE(SUM(oi.price_snapshot * oi.quantity), 0) AS revenue,
       COUNT(DISTINCT o.id) AS order_count
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN farms f ON f.id = oi.farm_id
     WHERE f.farmer_id = $1
       AND o.status != 'CANCELLED'
       AND o.placed_at >= NOW() - ($2 || ' days')::interval
     GROUP BY day
     ORDER BY day ASC`,
    [farmerId, daysParam]
  );

  const revenueTrend: RevenueTrendPoint[] = trendRes.rows.map((r) => ({
    date: r.day,
    revenue: Number(r.revenue),
    orders: parseInt(r.order_count, 10),
  }));

  const ordersTrend: OrdersTrendPoint[] = trendRes.rows.map((r) => ({
    date: r.day,
    orders: parseInt(r.order_count, 10),
  }));

  // 5. Top-selling products
  const topProductsRes = await conn.query<{
    product_id: string;
    name: string;
    category: string | null;
    units_sold: string;
    revenue: string;
  }>(
    `SELECT
       oi.product_id,
       oi.name_snapshot AS name,
       p.category::text AS category,
       SUM(oi.quantity) AS units_sold,
       SUM(oi.price_snapshot * oi.quantity) AS revenue
     FROM order_items oi
     JOIN farms f ON f.id = oi.farm_id
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE f.farmer_id = $1
       AND o.status != 'CANCELLED'
       AND o.placed_at >= NOW() - ($2 || ' days')::interval
     GROUP BY oi.product_id, oi.name_snapshot, p.category
     ORDER BY revenue DESC
     LIMIT 5`,
    [farmerId, daysParam]
  );

  const topProducts: BestSellerProduct[] = topProductsRes.rows.map((b) => ({
    id: b.product_id,
    name: b.name,
    category: b.category ?? "General",
    unitsSold: parseInt(b.units_sold, 10),
    revenue: Number(b.revenue),
  }));

  // 6. Order status distribution
  const nonCancelledCount = totalOrders - cancelledOrders;
  const safeDiv = (num: number, denom: number) => (denom > 0 ? Math.round((num / denom) * 100) : 0);

  const orderStatusDistribution: OrderStatusPoint[] = [
    {
      status: "DELIVERED",
      label: "Completed",
      count: completedOrders,
      percentage: safeDiv(completedOrders, totalOrders),
    },
    {
      status: "PROCESSING",
      label: "Processing",
      count: processingOrders,
      percentage: safeDiv(processingOrders, totalOrders),
    },
    {
      status: "PENDING",
      label: "Pending",
      count: pendingOrders,
      percentage: safeDiv(pendingOrders, totalOrders),
    },
    {
      status: "CANCELLED",
      label: "Cancelled",
      count: cancelledOrders,
      percentage: safeDiv(cancelledOrders, totalOrders),
    },
  ];

  // 7. Customers analysis
  const customerRes = await conn.query<{
    total_customers: string;
    new_customers: string;
    repeat_customers: string;
  }>(
    `WITH customer_orders AS (
       SELECT
         o.customer_id,
         MIN(o.placed_at) AS first_placed,
         COUNT(DISTINCT o.id) AS period_order_count
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN farms f ON f.id = oi.farm_id
       WHERE f.farmer_id = $1
         AND o.status != 'CANCELLED'
         AND o.placed_at >= NOW() - ($2 || ' days')::interval
       GROUP BY o.customer_id
     )
     SELECT
       COUNT(*) AS total_customers,
       COUNT(*) FILTER (WHERE first_placed >= NOW() - ($2 || ' days')::interval) AS new_customers,
       COUNT(*) FILTER (WHERE period_order_count > 1) AS repeat_customers
     FROM customer_orders`,
    [farmerId, daysParam]
  );

  const cRow = customerRes.rows[0];
  const totalCustomers = parseInt(cRow?.total_customers ?? "0", 10);
  const newCustomers = parseInt(cRow?.new_customers ?? "0", 10);
  const repeatCustomers = parseInt(cRow?.repeat_customers ?? "0", 10);
  const repeatPurchaseRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  const customerSummary: CustomerSummary = {
    total: totalCustomers,
    new: newCustomers,
    repeat: repeatCustomers,
    repeatRate: repeatPurchaseRate,
  };

  // 8. Category performance
  const categoryRes = await conn.query<{
    category: string;
    revenue: string;
    units_sold: string;
    products_count: string;
  }>(
    `SELECT
       COALESCE(p.category::text, 'Other') AS category,
       COALESCE(SUM(oi.price_snapshot * oi.quantity), 0) AS revenue,
       COALESCE(SUM(oi.quantity), 0) AS units_sold,
       COUNT(DISTINCT p.id) AS products_count
     FROM products p
     JOIN farms f ON f.id = p.farm_id
     LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id
                       AND o.status != 'CANCELLED'
                       AND o.placed_at >= NOW() - ($2 || ' days')::interval
     WHERE f.farmer_id = $1
     GROUP BY p.category
     ORDER BY revenue DESC`,
    [farmerId, daysParam]
  );

  const categoryPerformance: CategoryPerformancePoint[] = categoryRes.rows.map((c) => ({
    category: c.category,
    revenue: Number(c.revenue),
    unitsSold: parseInt(c.units_sold, 10),
    productsCount: parseInt(c.products_count, 10),
  }));

  // 9. Recent orders
  const recentOrdersRes = await conn.query<{
    id: string;
    order_number: string;
    placed_at: string;
    status: string;
    customer_name: string;
    farmer_amount: string;
    items_count: string;
  }>(
    `SELECT
       o.id,
       o.order_number,
       o.placed_at,
       o.status::text AS status,
       COALESCE(cp.full_name, 'Customer') AS customer_name,
       SUM(oi.price_snapshot * oi.quantity) AS farmer_amount,
       COUNT(oi.id) AS items_count
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN farms f ON f.id = oi.farm_id
     LEFT JOIN customer_profiles cp ON cp.user_id = o.customer_id
     WHERE f.farmer_id = $1
     GROUP BY o.id, o.order_number, o.placed_at, o.status, cp.full_name
     ORDER BY o.placed_at DESC
     LIMIT 6`,
    [farmerId]
  );

  const recentOrders: RecentOrderPoint[] = recentOrdersRes.rows.map((ro) => ({
    id: ro.id,
    orderNumber: ro.order_number,
    date: ro.placed_at ? new Date(ro.placed_at).toISOString().slice(0, 10) : "",
    customerName: ro.customer_name,
    amount: Number(ro.farmer_amount),
    status: ro.status,
    itemsCount: parseInt(ro.items_count, 10),
  }));

  // 10. Average rating
  const avgRatingRes = await conn.query<{ avg_rating: string | null }>(
    `SELECT round(avg(pr.rating)::numeric, 1) AS avg_rating
     FROM product_reviews pr
     JOIN products p ON p.id = pr.product_id
     JOIN farms f ON f.id = p.farm_id
     WHERE f.farmer_id = $1`,
    [farmerId]
  );
  const averageRating = avgRatingRes.rows[0]?.avg_rating ? parseFloat(avgRatingRes.rows[0].avg_rating) : 4.8;

  // Average order value (valid revenue / valid completed or non-cancelled orders)
  const validOrderCount = nonCancelledCount > 0 ? nonCancelledCount : totalOrders;
  const averageOrderValue = validOrderCount > 0 ? Math.round(totalRevenue / validOrderCount) : 0;

  const summary: AnalyticsSummary = {
    totalRevenue,
    totalOrders,
    completedOrders,
    pendingOrders,
    processingOrders,
    cancelledOrders,
    averageOrderValue,
    totalProducts,
    activeProducts,
    lowStockProducts: lowStock + outOfStock,
    totalCustomers,
    revenueGrowth,
    ordersGrowth,
  };

  return {
    period: periodInfo,
    summary,
    revenueTrend,
    ordersTrend,
    topProducts,
    orderStatusDistribution,
    inventorySummary,
    customerSummary,
    categoryPerformance,
    recentOrders,

    // Legacy fields for backwards compatibility
    revenue30d: totalRevenue,
    revenueTrendPercent: revenueGrowth,
    orders30d: totalOrders,
    ordersTrendPercent: ordersGrowth,
    productsSold: unitsSold,
    productsSoldTrendPercent: productsSoldTrend,
    newCustomers,
    newCustomersTrendPercent: 5.0,
    bestSellers: topProducts,
    performance: {
      repeatPurchaseRate,
      averageOrderValue,
      customerGrowthRate: ordersGrowth,
      averageRating,
    },
  };
}
