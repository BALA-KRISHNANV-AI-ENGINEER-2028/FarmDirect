import { listNotifications } from "../models/notification.model";
import {
  findNotificationPreferences,
  updateNotificationPreferences,
} from "../models/notificationPreferences.model";
import { HttpError } from "../utils/httpError";
import type { Pagination } from "../utils/pagination";

function toPreferencesDto(row: NonNullable<Awaited<ReturnType<typeof findNotificationPreferences>>>) {
  return {
    orderUpdates: row.order_updates,
    priceDrops: row.price_drops,
    newHarvests: row.new_harvests,
    promotions: row.promotions,
    newOrderAlerts: row.new_order_alerts,
    lowStockAlerts: row.low_stock_alerts,
    aiInsightUpdates: row.ai_insight_updates,
    customerReviews: row.customer_reviews,
  };
}

export async function getMyNotifications(userId: string, pagination: Pagination) {
  const { rows, total } = await listNotifications(userId, pagination.limit, pagination.offset);
  return {
    data: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.created_at,
    })),
    total,
  };
}

export interface UpdatePreferencesInput {
  orderUpdates?: boolean;
  priceDrops?: boolean;
  newHarvests?: boolean;
  promotions?: boolean;
  newOrderAlerts?: boolean;
  lowStockAlerts?: boolean;
  aiInsightUpdates?: boolean;
  customerReviews?: boolean;
}

export async function updateMyPreferences(userId: string, input: UpdatePreferencesInput) {
  const updated = await updateNotificationPreferences(userId, {
    order_updates: input.orderUpdates,
    price_drops: input.priceDrops,
    new_harvests: input.newHarvests,
    promotions: input.promotions,
    new_order_alerts: input.newOrderAlerts,
    low_stock_alerts: input.lowStockAlerts,
    ai_insight_updates: input.aiInsightUpdates,
    customer_reviews: input.customerReviews,
  });
  if (!updated) throw HttpError.notFound("Preferences not found");
  return toPreferencesDto(updated);
}
