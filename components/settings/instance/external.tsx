"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Button from "@/components/button";
import { toast } from "react-hot-toast";
import clsx from "clsx";

interface ExternalServicesProps {
  triggerToast?: typeof toast;
}

const ExternalServices: React.FC<ExternalServicesProps> & { title: string } = ({
  triggerToast = toast,
}) => {
  const router = useRouter();
  const { id: workspaceId } = router.query;

  const [rankingProvider, setRankingProvider] = useState<string>("");
  const [rankingToken, setRankingToken] = useState<string>("");
  const [rankingWorkspaceId, setRankingWorkspaceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;

    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/workspace/${workspaceId}/settings/external`
        );
        if (response.ok) {
          const data = await response.json();
          setRankingProvider(data.rankingProvider || "");
          setRankingToken(data.rankingToken || "");
          setRankingWorkspaceId(data.rankingWorkspaceId || "");
        }
      } catch (error) {
        console.error("Failed to fetch external services settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId) return;

    if (
      rankingProvider === "rankgun" &&
      (!rankingToken.trim() || !rankingWorkspaceId.trim())
    ) {
      triggerToast.error("RankGun requires both API key and workspace ID");
      return;
    }

    if (rankingProvider === "bloxyservices" && !rankingToken.trim()) {
      triggerToast.error("BloxyServices requires an API key");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/workspace/${workspaceId}/settings/external`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rankingProvider,
            rankingToken,
            rankingWorkspaceId,
          }),
        }
      );

      if (response.ok) {
        triggerToast.success("External services settings saved successfully!");
      } else {
        const error = await response.json();
        triggerToast.error(error.message || "Failed to save settings");
      }
    } catch (error) {
      triggerToast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    setRankingProvider(newProvider);
    if (newProvider === "" || newProvider !== rankingProvider) {
      setRankingToken("");
      setRankingWorkspaceId("");
    }
  };

  const rankingProviders = [
    { value: "", label: "None" },
    { value: "bloxyservices", label: "BloxyServices" },
    { value: "rankgun", label: "RankGun" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">
          Ranking Services
        </h4>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Configure external ranking services for intergrated promotions and
          demotions.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Ranking Provider
            </label>
            <select
              value={rankingProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={isLoading}
              className={clsx(
                "w-full px-3 py-2 border rounded-lg text-sm",
                "bg-white dark:bg-zinc-800",
                "border-zinc-300 dark:border-zinc-600",
                "text-zinc-900 dark:text-white",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {rankingProviders.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          {rankingProvider && rankingProvider !== "" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  API Key for{" "}
                  {
                    rankingProviders.find((p) => p.value === rankingProvider)
                      ?.label
                  }
                </label>
                <input
                  type="password"
                  value={rankingToken}
                  onChange={(e) => setRankingToken(e.target.value)}
                  placeholder={`Enter your ${
                    rankingProviders.find((p) => p.value === rankingProvider)
                      ?.label
                  } API key`}
                  disabled={isLoading}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-lg text-sm",
                    "bg-white dark:bg-zinc-800",
                    "border-zinc-300 dark:border-zinc-600",
                    "text-zinc-900 dark:text-white",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  This API key will be securely stored and used for API requests
                  to{" "}
                  {
                    rankingProviders.find((p) => p.value === rankingProvider)
                      ?.label
                  }
                  .
                </p>
              </div>

              {rankingProvider === "rankgun" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    RankGun Workspace ID
                  </label>
                  <input
                    type="text"
                    value={rankingWorkspaceId}
                    onChange={(e) => setRankingWorkspaceId(e.target.value)}
                    placeholder="Enter your RankGun workspace ID"
                    disabled={isLoading}
                    className={clsx(
                      "w-full px-3 py-2 border rounded-lg text-sm",
                      "bg-white dark:bg-zinc-800",
                      "border-zinc-300 dark:border-zinc-600",
                      "text-zinc-900 dark:text-white",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Your RankGun workspace ID is required for API
                    authentication.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
        Need a hand? Check our documentation at{' '}
        <a href="https://docs.planetaryapp.us/workspace/external" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          docs.planetaryapp.us
        </a>
      </p>

      <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

ExternalServices.title = "External Services";

export default ExternalServices;
