import React from "react";
import type { Quota } from "@prisma/client";
import {
  ProfileEmptyState,
  ProfileSection,
} from "@/components/profile/shell";
import { IconChartBar, IconUsers, IconBriefcase, IconUser } from "@tabler/icons-react";

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
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {quotas.map((quota: QuotaWithLinkage) => {
          const pct = getQuotaPercentage(quota) || 0;
          const isComplete = pct >= 100;
          const barWidth = Math.min(pct, 100);
          const currentVal = quota.currentValue != null
            ? quota.currentValue
            : Math.round((pct / 100) * (quota.value ?? 0));
          return (
            <div key={quota.id} className="py-3.5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                      {quota.name}
                    </span>
                    {isComplete && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Complete
                      </span>
                    )}
                    {quota.sessionType && quota.sessionType !== "all" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {quota.sessionType.charAt(0).toUpperCase() + quota.sessionType.slice(1)} only
                      </span>
                    )}
                    {quota.linkedVia && quota.linkedName && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white/95"
                        style={{ backgroundColor: quota.linkedColor || "#71717a" }}
                      >
                        {quota.linkedVia === "role" ? (
                          <IconUsers className="h-3 w-3 opacity-90" />
                        ) : quota.linkedVia === "department" ? (
                          <IconBriefcase className="h-3 w-3 opacity-90" />
                        ) : (
                          <IconUser className="h-3 w-3 opacity-90" />
                        )}
                        {quota.linkedName}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 tabular-nums text-sm font-bold text-zinc-900 dark:text-white">
                  {currentVal}
                  <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500"> / {quota.value}</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                {isComplete
                  ? pct > 100 ? `${pct.toFixed(0)}% · goal exceeded` : "Goal reached"
                  : `${pct.toFixed(0)}% complete`}
              </p>
            </div>
          );
        })}
      </div>
    </ProfileSection>
  );
}
