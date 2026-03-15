import React from "react";
import type { Quota } from "@prisma/client";
import { IconChartBar, IconUsers, IconBriefcase } from "@tabler/icons-react";
import Tooltip from "@/components/tooltip";

type QuotaWithLinkage = Quota & {
  currentValue?: number;
  percentage?: number;
  linkedVia?: 'role' | 'department';
  linkedName?: string;
  linkedColor?: string | null;
};

type Props = {
  quotas: QuotaWithLinkage[];
  displayMinutes: number;
  sessionsHosted: number;
  sessionsAttended: number;
  allianceVisits: number;
};

export function QuotasProgress({
  quotas,
  displayMinutes,
  sessionsHosted,
  sessionsAttended,
  allianceVisits,
}: Props) {
  const getQuotaPercentage = (quota: Quota | any) => {
    if (quota.percentage !== undefined) {
      return quota.percentage;
    }
    switch (quota.type) {
      case "mins": {
        return (displayMinutes / quota.value) * 100;
      }
      case "sessions_hosted": {
        return (sessionsHosted / quota.value) * 100;
      }
      case "sessions_attended": {
        return (sessionsAttended / quota.value) * 100;
      }
      case "sessions_logged": {
        const totalLogged = sessionsHosted + sessionsAttended;
        return (totalLogged / quota.value) * 100;
      }
      case "alliance_visits": {
        return (allianceVisits / quota.value) * 100;
      }
    }
  };

  const getQuotaProgress = (quota: Quota | any) => {
    if (quota.currentValue !== undefined) {
      return `${quota.currentValue} / ${quota.value} ${
        quota.type === "mins"
          ? "minutes"
          : quota.type === "alliance_visits"
          ? "visits"
          : quota.type.replace("_", " ")
      }`;
    }
    switch (quota.type) {
      case "mins": {
        return `${displayMinutes} / ${quota.value} minutes`;
      }
      case "sessions_hosted": {
        return `${sessionsHosted} / ${quota.value} sessions hosted`;
      }
      case "sessions_attended": {
        return `${sessionsAttended} / ${quota.value} sessions attended`;
      }
      case "sessions_logged": {
        const totalLogged = sessionsHosted + sessionsAttended;
        return `${totalLogged} / ${quota.value} sessions logged`;
      }
      case "alliance_visits": {
        return `${allianceVisits} / ${quota.value} alliance visits`;
      }
    }
  };

  if (quotas.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-3">
          <IconChartBar className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
          No quotas
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No activity quotas have been assigned yet
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-zinc-100 dark:border-zinc-700">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
          <IconChartBar className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Activity quotas
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Progress against assigned targets
          </p>
        </div>
      </div>
      <div className="p-4 md:p-5">
        <div className="space-y-4">
          {quotas.map((quota: QuotaWithLinkage) => {
            const pct = getQuotaPercentage(quota) || 0;
            const isComplete = pct >= 100;
            const barWidth = Math.min(pct, 100);
            return (
              <div
                key={quota.id}
                className="rounded-xl border border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {quota.name}
                  </h3>
                </div>
                {quota.sessionType && quota.sessionType !== "all" && (
                  <p className="text-xs font-medium text-primary mb-2">
                    {quota.sessionType.charAt(0).toUpperCase() + quota.sessionType.slice(1)} only
                  </p>
                )}
                {quota.linkedVia && quota.linkedName && (
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium text-white/95"
                      style={{ backgroundColor: quota.linkedColor || "#71717a" }}
                    >
                      {quota.linkedVia === "role" ? (
                        <IconUsers className="w-3 h-3 opacity-90" />
                      ) : (
                        <IconBriefcase className="w-3 h-3 opacity-90" />
                      )}
                      {quota.linkedName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Progress
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {quota.currentValue !== undefined ? quota.currentValue : 0}{" "}
                    <span className="font-normal text-zinc-400 dark:text-zinc-500">/ {quota.value}</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isComplete ? "bg-emerald-500" : "bg-primary"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {isComplete
                    ? pct > 100
                      ? `Goal exceeded · ${pct.toFixed(0)}%`
                      : "Complete"
                    : `${pct.toFixed(0)}% complete`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
