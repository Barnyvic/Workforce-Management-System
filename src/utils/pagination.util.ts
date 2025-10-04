import { PaginationParams, PaginatedResponse } from '@/types';

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationParams | undefined,
  total: number
): PaginatedResponse<T> {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 10;
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createEmbeddedPaginationMetadata(
  pagination: PaginationParams,
  total: number
) {
  const page = pagination.page;
  const limit = pagination.limit;
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
