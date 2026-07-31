/**
 * Orbit API
 *
 * Types for the API
 *
 * @module pages/api/v2/types
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

export type ErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type RequestResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ErrorBody;
    };
