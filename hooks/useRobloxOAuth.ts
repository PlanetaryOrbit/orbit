import { useState, useEffect } from 'react';

export const RobloxOAuthAvailable = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOAuthConfig = async () => {
      try {
        const response = await fetch('/api/auth/roblox/config-check');
        const data = await response.json();
        setIsAvailable(data.available || false);
      } catch (error) {
        console.error('Failed to check OAuth config:', error);
        setIsAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    checkOAuthConfig();
  }, []);

  return { isAvailable, loading };
};
