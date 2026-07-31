/**
 * Orbit API
 *
 * Rate limiter, information below
 *
 * @module pages/api/v2
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

 /**
  * Orbit API Rate Limiter
  *
  * Implements a distributed token bucket rate limiter.
  *
  * Anonymous clients receive 100 tokens per minute.
  * Authenticated users receive 500 tokens per minute.
  *
  * Each endpoint consumes a configurable number of tokens
  * ("request power") based on its computational cost.
  *
  * Certain operations may also define endpoint-specific
  * cooldowns that are enforced independently of the token
  * bucket (for example, workspace creation).
  *
  * Client identity is determined in the following order:
  *  1. API key
  *  2. Authenticated user ID
  *  3. Session ID
  *  4. Anonymous cookie
  *  5. IP address (fallback)
  *
  * The implementation is designed to support distributed
  * deployments using Redis as the backing store.
  */
