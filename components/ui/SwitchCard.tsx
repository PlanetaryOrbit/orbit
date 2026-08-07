"use client";

import { Switch } from "@headlessui/react";

interface Props {
  icon: React.ComponentType<any>;
  title: string;
  description?: string;
  enabled: boolean;
  setEnabled(value: boolean): void;
}

export default function SwitchCard({
  icon: Icon,
  title,
  description,
  enabled,
  setEnabled,
}: Props) {
  return (
    <Switch
      checked={enabled}
      onChange={setEnabled}
      className={`flex w-full items-center justify-between rounded-xl border p-3 transition ${enabled ? "border-ctp-instance bg-ctp-instance/10" : "border-ctp-surface1 bg-ctp-crust"}`}
    >
      <div className="flex items-center gap-3 text-left">
        <Icon className="h-5 w-5 text-ctp-subtext0" />
        <div>
          <p className="text-sm">
            {title}
          </p>
          {description && (
            <p className="text-xs text-ctp-subtext0">
              {description}
            </p>
          )}
        </div>
      </div>
      <div
        className={`flex h-6 w-11 items-center rounded-full p-1 transition cursor-pointer ${enabled ? "bg-ctp-instance justify-end" : "bg-ctp-surface1"}`}
      >
        <span
          className="h-4 w-4 rounded-full bg-ctp-text"
        />
      </div>
    </Switch>
  );
}
