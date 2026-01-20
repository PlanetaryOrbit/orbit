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
      <div className="text-center py-10">
        <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-8 max-w-md mx-auto">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <IconChartBar className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
            No Quotas
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            No activity quotas have been assigned yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-6 border-b border-zinc-200 dark:border-zinc-700">
        <div className="p-2 bg-primary/10 rounded-lg">
          <IconChartBar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold dark:text-white text-zinc-900">
            Activity Quotas
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Track how this member is progressing against their targets
          </p>
        </div>
      </div>
      <div className="p-4 md:p-6">
        <div className="grid gap-4">
          {quotas.map((quota: QuotaWithLinkage) => (
            <div
              key={quota.id}
              className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-sm font-medium dark:text-white text-zinc-900">
                  {quota.name}
                </h3>
              </div>
              {quota.sessionType && quota.sessionType !== 'all' && (
                <p className="text-xs text-primary mb-1">
                  Session type: {quota.sessionType.charAt(0).toUpperCase() + quota.sessionType.slice(1)}
                </p>
              )}
              {quota.linkedVia && quota.linkedName && (
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className="inline-flex items-center gap-1 text-white py-1 px-2 rounded-full text-xs font-medium"
                    style={{ backgroundColor: quota.linkedColor || "#6b7280" }}
                  >
                    {quota.linkedVia === 'role' ? (
                      <IconUsers className="w-3 h-3" />
                    ) : (
                      <IconBriefcase className="w-3 h-3" />
                    )}
                    {quota.linkedName}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Progress
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  {quota.currentValue !== undefined ? quota.currentValue : 0} / {quota.value}
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-600 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    (getQuotaPercentage(quota) || 0) >= 100
                      ? "bg-green-500"
                      : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(getQuotaPercentage(quota) || 0, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {(getQuotaPercentage(quota) || 0).toFixed(0)}% complete
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
