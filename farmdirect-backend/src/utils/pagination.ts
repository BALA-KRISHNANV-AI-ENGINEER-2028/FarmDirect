import type { Request } from "express";

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Reads ?page=&limit= from a request, clamping to sane bounds. */
export function parsePagination(req: Request): Pagination {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export function paginatedResponse<T>(data: T[], total: number, pagination: Pagination) {
  const meta: PaginatedMeta = { page: pagination.page, limit: pagination.limit, total };
  return { data, meta };
}
