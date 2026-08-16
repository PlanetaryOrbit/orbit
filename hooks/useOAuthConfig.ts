import { useEffect, useState } from "react";

type OAuthProvider = {
  available: boolean;
  configured: {
    applicationId: boolean;
    applicationSecret: boolean;
  };
  usingEnvVars: boolean;
};

type OAuthConfig = {
  discord: OAuthProvider;
  google: OAuthProvider;
  oauthOnly: boolean;
};

const DEFAULT_CONFIG: OAuthConfig = {
  discord: {
    available: false,
    configured: {
      applicationId: false,
      applicationSecret: false,
    },
    usingEnvVars: false,
  },

  google: {
    available: false,
    configured: {
      applicationId: false,
      applicationSecret: false,
    },
    usingEnvVars: false,
  },

  oauthOnly: false,
};

export function useOAuthConfig() {
  const [config, setConfig] = useState<OAuthConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/auth/config-check", {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `OAuth config request returned ${response.status}`,
          );
        }

        const data = (await response.json()) as OAuthConfig;

        setConfig({
          discord: data.discord ?? DEFAULT_CONFIG.discord,
          google: data.google ?? DEFAULT_CONFIG.google,
          oauthOnly: data.oauthOnly ?? false,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[AUTH] Failed to fetch OAuth configuration:",
          error,
        );

        setConfig(DEFAULT_CONFIG);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, []);

  return {
    ...config,
    loading,
  };
}
