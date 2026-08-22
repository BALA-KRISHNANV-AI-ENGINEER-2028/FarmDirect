import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface NotificationPreferencesRow {
  user_id: string;
  order_updates: boolean;
  price_drops: boolean;
  new_harvests: boolean;
  promotions: boolean;
  new_order_alerts: boolean;
  low_stock_alerts: boolean;
  ai_insight_updates: boolean;
  customer_reviews: boolean;
}

const db = (client?: PoolClient) => client ?? pool;

/** Called once at registration so every user has a preferences row (all defaults true). */
export async function insertDefaultNotificationPreferences(userId: string, client?: PoolClient): Promise<void> {
  await db(client).query(`INSERT INTO notification_preferences (user_id) VALUES ($1)`, [userId]);
}

export async function findNotificationPreferences(
  userId: string,
  client?: PoolClient
): Promise<NotificationPreferencesRow | null> {
  const res = await db(client).query<NotificationPreferencesRow>(
    `SELECT * FROM notification_preferences WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export async function updateNotificationPreferences(
  userId: string,
  fields: Partial<Omit<NotificationPreferencesRow, "user_id">>,
  client?: PoolClient
): Promise<NotificationPreferencesRow | null> {
  const res = await db(client).query<NotificationPreferencesRow>(
    `UPDATE notification_preferences SET
       order_updates = COALESCE($2, order_updates),
       price_drops = COALESCE($3, price_drops),
       new_harvests = COALESCE($4, new_harvests),
       promotions = COALESCE($5, promotions),
       new_order_alerts = COALESCE($6, new_order_alerts),
       low_stock_alerts = COALESCE($7, low_stock_alerts),
       ai_insight_updates = COALESCE($8, ai_insight_updates),
       customer_reviews = COALESCE($9, customer_reviews)
     WHERE user_id = $1
     RETURNING *`,
    [
      userId,
      fields.order_updates ?? null,
      fields.price_drops ?? null,
      fields.new_harvests ?? null,
      fields.promotions ?? null,
      fields.new_order_alerts ?? null,
      fields.low_stock_alerts ?? null,
      fields.ai_insight_updates ?? null,
      fields.customer_reviews ?? null,
    ]
  );
  return res.rows[0] ?? null;
}
