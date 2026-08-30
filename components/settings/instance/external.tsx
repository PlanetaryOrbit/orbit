"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import type { FC } from "react";
import Button from "@/components/button";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import {
  IconCheck,
  IconExternalLink,
  IconPlugConnected,
  IconLoader2,
} from "@tabler/icons-react";
import { ServiceCard } from "./ServiceCard";

interface ExternalServicesProps {
  triggerToast?: typeof toast;
  title?: string;
}

const ExternalServicesImpl: FC<ExternalServicesProps> = ({
  triggerToast = toast,
  title = "External Services",
}) => {
  const router = useRouter();
  const { id: workspaceId } = router.query;

  const [rankingProvider, setRankingProvider] = useState("");
  const [rankingWorkspaceId, setRankingWorkspaceId] = useState("");
  const [rankingMaxRank, setRankingMaxRank] = useState("");

  const [hasRankingToken, setHasRankingToken] = useState(false);

  const [rankGunToken, setRankGunToken] = useState("");
  const [replaceRankGun, setReplaceRankGun] = useState(false);
  const [integratedToken, setIntegratedToken] = useState("");
  const [replaceIntegrated, setReplaceIntegrated] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingRankGun, setTestingRankGun] = useState(false);
  const [testingIntegrated, setTestingIntegrated] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId || typeof workspaceId !== "string") return;
    setIsLoading(true);
    try {
      const extRes = await fetch(`/api/workspace/${workspaceId}/settings/external`);
      if (extRes.ok) {
        const data = await extRes.json();
        setRankingProvider(data.rankingProvider || "");
        setRankingWorkspaceId(data.rankingWorkspaceId || "");
        setHasRankingToken(!!data.hasRankingToken);
        setRankingMaxRank(
          typeof data.rankingMaxRank === "number" && data.rankingMaxRank > 0
            ? String(data.rankingMaxRank)
            : ""
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleProviderChange = (newProvider: string) => {
    setRankingProvider(newProvider);
    setRankGunToken("");
    setReplaceRankGun(false);
    setIntegratedToken("");
    setReplaceIntegrated(false);
    if (newProvider !== "rankgun") {
      setRankingWorkspaceId("");
    }
  };

  const testRankGun = async () => {
    if (!workspaceId || typeof workspaceId !== "string") return;
    const token = rankGunToken.trim();
    const ws = rankingWorkspaceId.trim();
    if (!ws) {
      triggerToast.error("Enter RankGun workspace ID");
      return;
    }
    if (!token && !hasRankingToken) {
      triggerToast.error("Enter API key or save a key first.");
      return;
    }
    setTestingRankGun(true);
    try {
      const r = await fetch(`/api/workspace/${workspaceId}/settings/external/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "rankgun",
          rankingWorkspaceId: ws,
          ...(token ? { rankingToken: token } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Test failed");
      triggerToast.success(data.message || "Key works");
    } catch (e: unknown) {
      triggerToast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTestingRankGun(false);
    }
  };

  const testIntegratedExternal = async () => {
    if (!workspaceId || typeof workspaceId !== "string") return;
    const token = integratedToken.trim();
    if (!token && !hasRankingToken) {
      triggerToast.error("Enter API key or save a key first.");
      return;
    }
    setTestingIntegrated(true);
    try {
      const r = await fetch(`/api/workspace/${workspaceId}/settings/external/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "opencloudranking",
          ...(token ? { rankingToken: token } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Test failed");
      triggerToast.success(data.message || "Key works");
    } catch (e: unknown) {
      triggerToast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTestingIntegrated(false);
    }
  };

  const handleSave = async () => {
    if (!workspaceId || typeof workspaceId !== "string") return;
    if (rankingProvider === "rankgun") {
      const token = rankGunToken.trim();
      const ws = rankingWorkspaceId.trim();
      if (!ws) {
        triggerToast.error("RankGun requires workspace ID");
        return;
      }
      if (!token && !hasRankingToken) {
        triggerToast.error("Enter API key");
        return;
      }
      if (replaceRankGun && !token) {
        triggerToast.error("Enter a new API key or cancel Replace");
        return;
      }
    }

    if (rankingProvider === "opencloudranking") {
      const tok = integratedToken.trim();
      if (!tok && !hasRankingToken) {
        triggerToast.error("Integrated Ranking requires its own Open Cloud API key");
        return;
      }
      if (replaceIntegrated && !tok) {
        triggerToast.error("Enter a new API key or cancel Replace key");
        return;
      }
    }

    setIsSaving(true);
    try {
      const maxRaw = rankingMaxRank.trim();
      const body: Record<string, unknown> = {
        rankingProvider,
        rankingWorkspaceId,
        rankingMaxRank: maxRaw === "" ? null : Number(maxRaw),
      };
      if (rankingProvider === "rankgun") {
        const t = rankGunToken.trim();
        if (t) body.rankingToken = t;
      }
      if (rankingProvider === "opencloudranking") {
        const t = integratedToken.trim();
        if (t) body.rankingToken = t;
      }

      const response = await fetch(`/api/workspace/${workspaceId}/settings/external`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to save");
      }
      triggerToast.success("External services saved");
      setRankGunToken("");
      setReplaceRankGun(false);
      setIntegratedToken("");
      setReplaceIntegrated(false);
      await load();
    } catch (error: unknown) {
      triggerToast.error(
        error instanceof Error ? error.message : "Failed to save"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const rankingProviders = [
    { value: "", label: "None" },
    { value: "rankgun", label: "RankGun" },
    { value: "bloxyservices", label: "BloxyServices" },
    { value: "opencloudranking", label: "Integrated Ranking" },
  ];

  const inputClass = clsx(
    "w-full rounded-xl border px-3 py-2.5 text-sm transition-colors",
    "border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-white",
    "placeholder-zinc-400 focus:border-[color:rgb(var(--group-theme))] focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)]",
    "disabled:cursor-not-allowed disabled:opacity-50"
  );

  const showRankLimit =
    rankingProvider === "opencloudranking" || rankingProvider === "rankgun";

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
          <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Ranking provider
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
          {!rankingProvider && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
              Promotion, demotion, and termination logs will not change ranks in
              the Roblox group.
            </p>
          )}
        </div>

        {rankingProvider === "rankgun" && (
          <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                RankGun workspace ID
              </label>
              <input
                type="text"
                value={rankingWorkspaceId}
                onChange={(e) => setRankingWorkspaceId(e.target.value)}
                placeholder="Workspace ID"
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            {hasRankingToken && !replaceRankGun ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                      API key
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      A key is saved. It is not shown again. Use{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        Replace key
                      </span>{" "}
                      to rotate it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceRankGun(true);
                      setRankGunToken("");
                    }}
                    className="shrink-0 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Replace key
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void testRankGun()}
                    disabled={testingRankGun || isLoading || !rankingWorkspaceId.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                  >
                    {testingRankGun ? (
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Test key
                  </button>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <IconCheck className="h-3.5 w-3.5" stroke={2} />
                    Saved
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  API key
                </label>
                <input
                  type="password"
                  value={rankGunToken}
                  onChange={(e) => setRankGunToken(e.target.value)}
                  autoComplete="off"
                  placeholder={replaceRankGun ? "New API key" : "API key"}
                  disabled={isLoading}
                  className={inputClass}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void testRankGun()}
                    disabled={
                      testingRankGun || isLoading || !rankGunToken.trim()
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                  >
                    {testingRankGun ? (
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Test key
                  </button>
                  {hasRankingToken && replaceRankGun && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplaceRankGun(false);
                        setRankGunToken("");
                      }}
                      className="text-xs text-zinc-500 underline dark:text-zinc-400"
                    >
                      Cancel replace
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {rankingProvider === "opencloudranking" && (
          <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Integrated Ranking uses a dedicated{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Open Cloud API key
              </span>{" "}
              stored only for rankings (not the key from Roblox API settings). Requires
              group read and write scopes.
            </p>

            {hasRankingToken && !replaceIntegrated ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                      Integrated ranking key
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      A key is saved. It is not shown again. Use{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        Replace key
                      </span>{" "}
                      to rotate it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceIntegrated(true);
                      setIntegratedToken("");
                    }}
                    className="shrink-0 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Replace key
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void testIntegratedExternal()}
                    disabled={testingIntegrated || isLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                  >
                    {testingIntegrated ? (
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Test key
                  </button>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <IconCheck className="h-3.5 w-3.5" stroke={2} />
                    Saved
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Integrated ranking key
                </label>
                <input
                  type="password"
                  value={integratedToken}
                  onChange={(e) => setIntegratedToken(e.target.value)}
                  autoComplete="off"
                  placeholder="Paste Roblox Open Cloud API key"
                  disabled={isLoading}
                  className={inputClass}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void testIntegratedExternal()}
                    disabled={
                      testingIntegrated ||
                      isLoading ||
                      (!integratedToken.trim() && !hasRankingToken)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                  >
                    {testingIntegrated ? (
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Test key
                  </button>
                  {hasRankingToken && replaceIntegrated && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplaceIntegrated(false);
                        setIntegratedToken("");
                      }}
                      className="text-xs text-zinc-500 underline dark:text-zinc-400"
                    >
                      Cancel replace
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {showRankLimit && (
          <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Highest rank Orbit may promote to
            </label>
            <input
              type="number"
              min={1}
              max={255}
              value={rankingMaxRank}
              onChange={(e) => setRankingMaxRank(e.target.value)}
              placeholder="No limit (leave empty)"
              disabled={isLoading}
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
              Integrated Ranking will not promote or set a rank above this Roblox
              group rank number. Leave empty for no limit.
            </p>
          </div>
        )}

        {rankingProvider &&
          rankingProvider !== "" &&
          rankingProvider !== "rankgun" &&
          rankingProvider !== "opencloudranking" && (
            <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  API key
                </label>
                <input
                  type="password"
                  value={rankGunToken}
                  onChange={(e) => setRankGunToken(e.target.value)}
                  placeholder="API key"
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
            </div>
          )}
      </div>
    </ServiceCard>
  );
};

const ExternalServices = ExternalServicesImpl as typeof ExternalServicesImpl & {
  title: string;
};
ExternalServices.title = "External Services";

export default ExternalServices;
