import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function listNotifications(
  userId: string,
  limit: number,
  offset: number,
  client?: PoolClient
): Promise<{ rows: NotificationRow[]; total: number }> {
  const [rowsRes, countRes] = await Promise.all([
    db(client).query<NotificationRow>(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    db(client).query<{ count: string }>(`SELECT count(*) FROM notifications WHERE user_id = $1`, [userId]),
  ]);
  return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
}

export async function markNotificationRead(
  id: string,
  userId: string,
  client?: PoolClient
): Promise<NotificationRow | null> {
  const res = await db(client).query<NotificationRow>(
    `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId]
  );
  return res.rows[0] ?? null;
}

export async function markAllNotificationsRead(userId: string, client?: PoolClient): Promise<void> {
  await db(client).query(`UPDATE notifications SET read = true WHERE user_id = $1`, [userId]);
}
