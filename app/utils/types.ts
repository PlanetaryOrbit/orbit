export type ErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  fields?: Record<string, string[]>;
};

export type User = {
  id: string;
  username: string;
  robloxId: number; // BigInt
  notifications: Notification[];
  robloxData: RobloxData;
}

export type RobloxData = {
  
}

export type Notification = {
  
}

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
  // DEVELOPMENT TYPES, These are only returned in development environments
  requestId?: string; // The requestId that uniquely identifies this request, helpful for debugging
  oauthType?: 'apiKey' | 'user'; // The type of OAuth authentication used for this request
  // END DEVELOPMENT TYPES
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
