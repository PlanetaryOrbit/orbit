import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to manage CSRF tokens for API requests
 * 
 * Usage:
 * ```tsx
 * const { token, refresh, loading } = useCsrfToken();
 * 
 * // Include token in API requests:
 * fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': token || '',
 *   },
 *   body: JSON.stringify(data)
 * });
 * ```
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/csrf-token');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.token) {
        setToken(data.token);
      } else {
        throw new Error(data.error || 'Failed to get CSRF token');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching CSRF token:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
    
    // Refresh token periodically (every 30 minutes)
    const interval = setInterval(() => {
      fetchToken();
    }, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchToken]);

  return {
    token,
    loading,
    error,
    refresh: fetchToken,
  };
}

/**
 * Helper function to add CSRF token to fetch options
 * 
 * Usage:
 * ```tsx
 * const options = withCsrfToken(token, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data)
 * });
 * 
 * fetch('/api/endpoint', options);
 * ```
 */
export function withCsrfToken(
  token: string | null,
  options: RequestInit = {}
): RequestInit {
  if (!token) {
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token,
    },
  };
}
