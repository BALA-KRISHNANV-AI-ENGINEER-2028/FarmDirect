import type { PoolClient } from "pg";
import { pool } from "../config/database";

export interface AddressRow {
  id: string;
  customer_id: string;
  label: string | null;
  full_name: string | null;
  phone: string | null;
  address_line: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const db = (client?: PoolClient) => client ?? pool;

export async function listAddressesByCustomerId(customerId: string, client?: PoolClient): Promise<AddressRow[]> {
  const res = await db(client).query<AddressRow>(
    `SELECT * FROM addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC`,
    [customerId]
  );
  return res.rows;
}

export async function findAddressById(id: string, client?: PoolClient): Promise<AddressRow | null> {
  const res = await db(client).query<AddressRow>(`SELECT * FROM addresses WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] ?? null;
}

export async function findAddressOwnerId(id: string, client?: PoolClient): Promise<string | null> {
  const res = await db(client).query<{ customer_id: string }>(
    `SELECT customer_id FROM addresses WHERE id = $1 LIMIT 1`,
    [id]
  );
  return res.rows[0]?.customer_id ?? null;
}

export interface CreateAddressInput {
  customerId: string;
  label?: string | null;
  fullName?: string | null;
  phone?: string | null;
  addressLine: string;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  isDefault?: boolean;
}

/**
 * The DB has a partial unique index enforcing at most one is_default=true
 * row per customer (addresses_one_default_per_customer). Setting a new
 * default must unset any existing one first, in the same transaction, or
 * the insert/update would violate that constraint.
 */
export async function insertAddress(input: CreateAddressInput, client?: PoolClient): Promise<AddressRow> {
  if (input.isDefault) {
    await db(client).query(`UPDATE addresses SET is_default = false WHERE customer_id = $1 AND is_default`, [
      input.customerId,
    ]);
  }
  const res = await db(client).query<AddressRow>(
    `INSERT INTO addresses (customer_id, label, full_name, phone, address_line, city, state, postal_code, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.customerId,
      input.label ?? null,
      input.fullName ?? null,
      input.phone ?? null,
      input.addressLine,
      input.city ?? null,
      input.state ?? null,
      input.postalCode ?? null,
      input.isDefault ?? false,
    ]
  );
  return res.rows[0];
}

export interface UpdateAddressInput {
  label?: string | null;
  fullName?: string | null;
  phone?: string | null;
  addressLine?: string;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  isDefault?: boolean;
}

export async function updateAddress(
  id: string,
  customerId: string,
  fields: UpdateAddressInput,
  client?: PoolClient
): Promise<AddressRow | null> {
  if (fields.isDefault) {
    await db(client).query(
      `UPDATE addresses SET is_default = false WHERE customer_id = $1 AND is_default AND id != $2`,
      [customerId, id]
    );
  }
  const res = await db(client).query<AddressRow>(
    `UPDATE addresses SET
       label = COALESCE($3, label),
       full_name = COALESCE($4, full_name),
       phone = COALESCE($5, phone),
       address_line = COALESCE($6, address_line),
       city = COALESCE($7, city),
       state = COALESCE($8, state),
       postal_code = COALESCE($9, postal_code),
       is_default = COALESCE($10, is_default)
     WHERE id = $1 AND customer_id = $2
     RETURNING *`,
    [
      id,
      customerId,
      fields.label ?? null,
      fields.fullName ?? null,
      fields.phone ?? null,
      fields.addressLine ?? null,
      fields.city ?? null,
      fields.state ?? null,
      fields.postalCode ?? null,
      fields.isDefault ?? null,
    ]
  );
  return res.rows[0] ?? null;
}

export async function deleteAddress(id: string, client?: PoolClient): Promise<void> {
  await db(client).query(`DELETE FROM addresses WHERE id = $1`, [id]);
}
