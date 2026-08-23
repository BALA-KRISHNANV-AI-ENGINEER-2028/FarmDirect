import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface OrderStatusEventRow {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  created_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function insertOrderStatusEvent(
  input: { orderId: string; status: string; note?: string | null },
  client?: PoolClient
): Promise<OrderStatusEventRow> {
  const res = await db(client).query<OrderStatusEventRow>(
    `INSERT INTO order_status_events (order_id, status, note) VALUES ($1, $2, $3) RETURNING *`,
    [input.orderId, input.status, input.note ?? null]
  );
  return res.rows[0];
}

export async function listOrderStatusEvents(orderId: string, client?: PoolClient): Promise<OrderStatusEventRow[]> {
  const res = await db(client).query<OrderStatusEventRow>(
    `SELECT * FROM order_status_events WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId]
  );
  return res.rows;
}
