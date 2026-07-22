import type { PaginatedResult, PaginationMeta } from '@food-delivery/types';
import { sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { DrizzleDB } from '../database/database.service';

export type { PaginatedResult, PaginationMeta };

export interface PaginateOptions {
  page: number;
  limit: number;
  /** Optional filter applied to both the count and the page query. */
  where?: SQL;
  /** Optional ordering for the page query. */
  orderBy?: SQL | SQL[];
}

function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Runs a paginated `SELECT` over a table: a `count(*)` and a `limit`/`offset`
 * page query share the same `where` clause. Returns the page plus metadata.
 */
export async function paginate<T>(
  db: DrizzleDB,
  table: PgTable,
  { page, limit, where, orderBy }: PaginateOptions,
): Promise<PaginatedResult<T>> {
  const offset = (page - 1) * limit;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(table)
    .where(where);

  const total = countRow?.count ?? 0;

  let query = db
    .select()
    .from(table)
    .where(where)
    .limit(limit)
    .offset(offset)
    .$dynamic();

  if (orderBy) {
    query = query.orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]));
  }

  const items = (await query) as T[];

  return { items, meta: buildMeta(total, page, limit) };
}
