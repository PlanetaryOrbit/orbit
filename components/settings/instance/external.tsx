"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Button from "@/components/button";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import { IconPlugConnected, IconExternalLink, IconCheck } from "@tabler/icons-react";

interface ExternalServicesProps {
  triggerToast?: typeof toast;
  title?: string;
}

const ExternalServices: React.FC<ExternalServicesProps> & { title: string } = ({
  triggerToast = toast,
  title = "External Services",
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
    { value: "rankgun", label: "RankGun" },
    { value: "upraise", label: "Upraise" },
  ];

  const inputClass = clsx(
    "w-full px-3 py-2.5 border rounded-xl text-sm transition-colors",
    "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-600",
    "text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500",
    "focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] focus:border-[color:rgb(var(--group-theme))]",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))] shrink-0">
          <IconPlugConnected className="w-6 h-6" stroke={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configure external ranking services for integrated promotions and demotions.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Ranking Provider
          </label>
          <select
            value={rankingProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={isLoading}
            className={inputClass}
          >
            {rankingProviders.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        {rankingProvider && rankingProvider !== "" && (
          <div className="space-y-5 pl-0">
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
                className={inputClass}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                This API key will be securely stored and used for API requests to{" "}
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
                  className={inputClass}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                  Your RankGun workspace ID is required for API authentication.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <a
          href="https://docs.planetaryapp.us/workspace/external"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-[color:rgb(var(--group-theme))] transition-colors"
        >
          <IconExternalLink className="w-4 h-4" stroke={1.5} />
          docs.planetaryapp.us
        </a>
      </div>

      <div className="flex justify-end pt-6 border-t border-zinc-200/80 dark:border-zinc-700/80">
        <Button onClick={handleSave} disabled={isSaving || isLoading} workspace>
          <span className="inline-flex items-center gap-2">
            <IconCheck className="w-4 h-4" stroke={1.5} />
            {isSaving ? "Saving..." : "Save Settings"}
          </span>
        </Button>
      </div>
    </div>
  );
};

ExternalServices.title = "External Services";

export default ExternalServices;