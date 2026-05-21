import React from "react";
import type { Quota } from "@prisma/client";
import {
  ProfileEmptyState,
  ProfileSection,
} from "@/components/profile/shell";
import { IconChartBar, IconUsers, IconBriefcase, IconUser } from "@tabler/icons-react";
import Tooltip from "@/components/tooltip";

type QuotaWithLinkage = Quota & {
  currentValue?: number;
  percentage?: number;
  linkedVia?: "role" | "department" | "user";
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
      <ProfileSection
        icon={IconChartBar}
        title="Activity Quotas"
        subtitle="Progress against assigned targets"
      >
        <ProfileEmptyState
          icon={IconChartBar}
          title="No quotas assigned"
          description="Activity quotas will appear here when assigned"
        />
      </ProfileSection>
    );
  }

  return (
    <ProfileSection
      icon={IconChartBar}
      title="Activity Quotas"
      subtitle="Progress against assigned targets"
    >
      <div className="space-y-3">
        {quotas.map((quota: QuotaWithLinkage) => {
          const pct = getQuotaPercentage(quota) || 0;
          const isComplete = pct >= 100;
          const barWidth = Math.min(pct, 100);
          const currentVal = quota.currentValue !== undefined ? quota.currentValue : 0;
          return (
            <div
              key={quota.id}
              className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800/60"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {quota.name}
                    </h3>
                    {isComplete && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
                        ) : quota.linkedVia === "department" ? (
                          <IconBriefcase className="w-3 h-3 opacity-90" />
                        ) : (
                          <IconUser className="w-3 h-3 opacity-90" />
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
    </ProfileSection>
  );
}
