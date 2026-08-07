"use client";

import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { Transition } from "@headlessui/react";
import toast, { Toast } from "react-hot-toast";
import Button from "@/components/Button";

type ToastType =
  | "success"
  | "error"
  | "info"
  | "warning"
  | "loading";

interface CustomToastProps {
  t: Toast;
  message: string;
  type?: ToastType;
}

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  loading: ArrowPathIcon,
};

const colors = {
  success: {
    icon: "text-ctp-green",
    border: "border-ctp-green/30",
    bg: "bg-ctp-green/10",
  },
  error: {
    icon: "text-ctp-red",
    border: "border-ctp-red/30",
    bg: "bg-ctp-red/10",
  },
  info: {
    icon: "text-ctp-blue",
    border: "border-ctp-blue/30",
    bg: "bg-ctp-blue/10",
  },
  warning: {
    icon: "text-ctp-yellow",
    border: "border-ctp-yellow/30",
    bg: "bg-ctp-yellow/10",
  },
  loading: {
    icon: "text-ctp-blue",
    border: "border-ctp-blue/30",
    bg: "bg-ctp-blue/10",
  },
};

export default function CustomToast({
  t,
  message,
  type = "info",
}: CustomToastProps) {
  const Icon = icons[type];
  const color = colors[type];

  return (
    <Transition
      appear
      show={t.visible}
      enter="transition duration-200 ease-out"
      enterFrom="translate-y-3 opacity-0 scale-95"
      enterTo="translate-y-0 opacity-100 scale-100"
      leave="transition duration-150 ease-in"
      leaveFrom="translate-y-0 opacity-100 scale-100"
      leaveTo="translate-y-3 opacity-0 scale-95"
    >
      <div
        className="
          pointer-events-auto
          flex
          w-96
          items-start
          gap-3
          rounded-2xl
          border
          border-ctp-surface0
          bg-ctp-mantle/90
          p-4
          shadow-2xl
          backdrop-blur-xl
        "
      >
        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${color.bg}
          `}
        >
          <Icon
            className={`
              h-5
              w-5
              ${color.icon}
              ${type === "loading" ? "animate-spin" : ""}
            `}
          />
        </div>

        <p className="flex-1 pt-2 text-sm text-ctp-text">
          {message}
        </p>

        {type !== "loading" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.dismiss(t.id)}
            className="
              h-8!
              w-8!
              p-0!
              text-ctp-subtext0
              hover:text-ctp-text
            "
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Transition>
  );
}
