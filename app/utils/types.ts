export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type User = {
  id: string;
  username: string;
  robloxId: string;
  robloxData: JsonValue | null;
  discordData: JsonValue | null;
  googleData: JsonValue | null;
  banned: boolean;
  bannedAt: string | null;
  bannedFor: string | null;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Credential = {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type InstanceSettings = {
  id: string;
  name: string;
  logoUrl: string;
  allowPasswordAuth: boolean;
  allowRobloxAuth: boolean;
  enableRegistration: boolean;
  primaryColor: string;
  darkBackground: string;
  lightBackground: string;
  isSetup: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Media = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  hash: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  icon: string | null;
  url: string | null;
  sentAt: string;
  expiresAt: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export type Session = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type SignupAttempt = {
  id: string;
  username: string;
  passwordHash: string;
  robloxId: string;
  verificationCode: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

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
