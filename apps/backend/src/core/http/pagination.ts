import { z } from 'zod';

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export function pageResult<T>(items: T[], total: number, limit: number, offset: number) {
  return {
    data: items,
    pagination: { total, limit, offset, hasMore: offset + items.length < total },
  };
}
