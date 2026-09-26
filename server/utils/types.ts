import type { FieldOutputTypes } from '~~/prisma/contract.d';

type PublicModels = FieldOutputTypes['public'];

export type User = PublicModels['User'];

export type ErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  fields?: Record<string, string[]>;
};

export type PaginationMeta = {
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type RateLimitMeta = {
  limit: number;
  remaining: number;
  resetAt: string;
};

export type ResponseMeta = {
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
};

export type ApiResponse<T, M extends ResponseMeta = ResponseMeta> =
  | {
      success: true;
      data: T;
      meta?: M;
    }
  | {
      success: false;
      error: ErrorBody;
      meta?: M;
    };

export type PaginatedResponse<T> = ApiResponse<
  T[],
  ResponseMeta & {
    pagination: PaginationMeta;
  }
>;
