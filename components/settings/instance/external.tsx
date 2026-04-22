"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Button from "@/components/button";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import { IconCheck, IconExternalLink, IconPlugConnected } from "@tabler/icons-react";
import { ServiceCard } from "./ServiceCard";

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
        const response = await fetch(`/api/workspace/${workspaceId}/settings/external`);
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
    if (rankingProvider === "rankgun" && (!rankingToken.trim() || !rankingWorkspaceId.trim())) {
      triggerToast.error("RankGun requires both API key and workspace ID");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/settings/external`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankingProvider, rankingToken, rankingWorkspaceId }),
      });
      if (response.ok) {
        triggerToast.success("External services saved");
      } else {
        const error = await response.json();
        triggerToast.error(error.message || "Failed to save");
      }
    } catch (error) {
      triggerToast.error("Failed to save");
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
    { value: "opencloudranking", label: "Integrated Ranking"}
  ];

  const inputClass = clsx(
    "w-full rounded-xl border px-3 py-2.5 text-sm transition-colors",
    "border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-white",
    "placeholder-zinc-400 focus:border-[color:rgb(var(--group-theme))] focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)]",
    "disabled:cursor-not-allowed disabled:opacity-50"
  );

  return (
    <ServiceCard
      icon={IconPlugConnected}
      title={title}
      description="Connect a ranking provider for in-app promotions and demotions."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://docs.planetaryapp.us/workspace/external"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-[color:rgb(var(--group-theme))] dark:text-zinc-400"
          >
            <IconExternalLink className="h-3.5 w-3.5" stroke={1.5} />
            Documentation
          </a>
          <Button onClick={handleSave} disabled={isSaving || isLoading} workspace>
            <span className="inline-flex items-center gap-2">
              <IconCheck className="h-4 w-4" stroke={1.5} />
              {isSaving ? "Saving…" : "Save"}
            </span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Ranking provider</label>
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
          <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">API key</label>
              <input
                type="password"
                value={rankingToken}
                onChange={(e) => setRankingToken(e.target.value)}
                placeholder="API key"
                disabled={isLoading}
                className={inputClass}
              />
            </div>
            {rankingProvider === "rankgun" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">RankGun workspace ID</label>
                <input
                  type="text"
                  value={rankingWorkspaceId}
                  onChange={(e) => setRankingWorkspaceId(e.target.value)}
                  placeholder="Workspace ID"
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ServiceCard>
  );
};

ExternalServices.title = "External Services";

export default ExternalServices;
