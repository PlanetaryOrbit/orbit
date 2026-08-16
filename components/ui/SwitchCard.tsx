"use client";

import { Switch } from "@headlessui/react";
import type { ComponentType, SVGProps } from "react";

interface Props {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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
      className={`flex w-full items-center justify-between rounded-xl border p-3 transition-all duration-200 ${enabled ? "border-ctp-instance bg-ctp-instance/10" : "border-ctp-surface1 bg-ctp-crust"}`}
    >
      <div className="flex items-center gap-3 text-left">
        <Icon className="h-5 w-5 text-ctp-subtext0" />

        <div>
          <p className="text-sm font-medium text-ctp-text">{title}</p>

          {description && (
            <p className="mt-0.5 text-xs text-ctp-subtext0">{description}</p>
          )}
        </div>
      </div>

      <div
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
          enabled
            ? "justify-end bg-ctp-instance"
            : "justify-start bg-ctp-surface1"
        }`}
      >
        <div className="h-4 w-4 rounded-full bg-ctp-text shadow-sm transition-transform duration-200" />
      </div>
    </Switch>
  );
}
