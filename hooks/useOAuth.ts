import { useState, useEffect } from "react";

export const OAuthAvailable = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [oauthOnly, setOauthOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOAuthConfig = async () => {
      try {
        const response = await fetch("/api/auth/roblox/config-check");
        const data = await response.json();
        setIsAvailable(data.available || false);
        setOauthOnly(data.oauthOnly || false);
      } catch (error) {
        console.error("Failed to check OAuth config:", error);
        setIsAvailable(false);
        setOauthOnly(false);
      } finally {
        setLoading(false);
      }
    };

    checkOAuthConfig();
  }, []);

  return { isAvailable, oauthOnly, loading };
};
