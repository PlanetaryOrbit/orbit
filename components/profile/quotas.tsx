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
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/60">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <IconChartBar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Activity Quotas</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Progress against assigned targets</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700/50 rounded-full flex items-center justify-center">
            <IconChartBar className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No quotas assigned</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Activity quotas will appear here when assigned</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/80 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/60">
        <div className="p-1.5 bg-primary/10 rounded-md">
          <IconChartBar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Activity Quotas</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Progress against assigned targets</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {quotas.map((quota: QuotaWithLinkage) => {
          const pct = getQuotaPercentage(quota) || 0;
          const isComplete = pct >= 100;
          const barWidth = Math.min(pct, 100);
          const currentVal = quota.currentValue !== undefined ? quota.currentValue : 0;
          return (
            <div
              key={quota.id}
              className="rounded-xl border border-zinc-100 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-700/30 p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {quota.name}
                    </h3>
                    {isComplete && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Complete
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {quota.sessionType && quota.sessionType !== "all" && (
                      <span className="text-xs font-medium text-primary">
                        {quota.sessionType.charAt(0).toUpperCase() + quota.sessionType.slice(1)} only
                      </span>
                    )}
                    {quota.linkedVia && quota.linkedName && (
                      <span
                        className="inline-flex items-center gap-1 py-0.5 px-2 rounded text-xs font-medium text-white/95"
                        style={{ backgroundColor: quota.linkedColor || "#71717a" }}
                      >
                        {quota.linkedVia === "role" ? (
                          <IconUsers className="w-3 h-3 opacity-90" />
                        ) : (
                          <IconBriefcase className="w-3 h-3 opacity-90" />
                        )}
                        {quota.linkedName}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-white shrink-0">
                  {currentVal}
                  <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500"> / {quota.value}</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-600/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete ? "bg-emerald-500" : "bg-primary"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
                {isComplete
                  ? pct > 100
                    ? `${pct.toFixed(0)}% · goal exceeded`
                    : "Goal reached"
                  : `${pct.toFixed(0)}% complete`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
