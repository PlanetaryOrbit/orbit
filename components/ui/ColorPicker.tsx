"use client";

import { PaintBrushIcon } from "@heroicons/react/24/solid";
import { ComponentType, SVGProps } from "react";

interface ColorInputProps {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export default function ColorInput({
  label,
  value,
  onChange,
  placeholder = "#89b4fa",
  icon: Icon = PaintBrushIcon,
}: ColorInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
        {label}
      </label>

      <div
        className="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 transition focus-within:border-ctp-instance"
      >
        <Icon className="mr-2 h-5 w-5 text-ctp-subtext0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm uppercase outline-none placeholder:text-ctp-overlay0"
        />

        <label
          className="relative ml-3 h-7 w-7 cursor-pointer overflow-hidden rounded-lg border border-ctp-surface1"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />

          <span
            className="block h-full w-full"
            style={{
              backgroundColor: value,
            }}
          />
        </label>
      </div>
    </div>
  );
}
