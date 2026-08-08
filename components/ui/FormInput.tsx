"use client";

import type { ComponentType, InputHTMLAttributes, SVGProps } from "react";

interface FormInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange(value: string): void;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export default function FormInput({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  className = "",
  ...props
}: FormInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
        {label}
      </label>

      <div className="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 transition focus-within:border-ctp-instance">
        {Icon && (
          <Icon
            className="mr-2 h-5 w-5 shrink-0 text-ctp-subtext0"
            aria-hidden="true"
          />
        )}

        <input
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent text-sm outline-none placeholder:text-ctp-overlay0 ${className}`}
        />
      </div>
    </div>
  );
}
