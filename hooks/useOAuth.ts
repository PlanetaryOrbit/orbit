import { useState, useEffect } from "react";

export const OAuthAvailable = () => {
  const [oauthOnly, setOauthOnly] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const checkOAuthConfig = async () => {
      try {
        const response = await fetch("/api/auth/oauth/check");
        const data = await response.json();
        setOauthOnly(data.oauthOnly || false);
        setIsAvailable(data.isAvailable)
      } catch (error) {
        console.error("Failed to check OAuth config:", error);
        setOauthOnly(false);
      }
    };

    checkOAuthConfig();
  }, []);

  return { oauthOnly, isAvailable };
}