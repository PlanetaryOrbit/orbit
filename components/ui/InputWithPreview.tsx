"use client";

import { ComponentType, SVGProps, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/solid";

interface InputWithPreviewProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange(value: string): void;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  alt?: string;
}

export default function InputWithPreview({
  label,
  value,
  placeholder = "Image URL",
  onChange,
  icon: Icon = PhotoIcon,
  alt = "Preview",
}: InputWithPreviewProps) {
  const [error, setError] = useState(false);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
        {label}
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 transition focus-within:border-ctp-instance">
          <Icon className="mr-2 h-5 w-5 text-ctp-subtext0" />

          <input
            value={value}
            onChange={(e) => {
              setError(false);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-ctp-overlay0"
          />
        </div>

        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-crust">
          {value && !error ? (
            <img
              src={value}
              alt={alt}
              className="h-full w-full object-contain"
              onError={() => setError(true)}
            />
          ) : (
            <PhotoIcon className="h-5 w-5 text-ctp-overlay0" />
          )}
        </div>
      </div>
    </div>
  );
}
