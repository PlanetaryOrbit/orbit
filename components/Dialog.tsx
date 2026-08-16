"use client";

import {
  Dialog as HeadlessDialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import type {
  ComponentType,
  ReactNode,
  SVGProps,
} from "react";

import Button, { type ButtonProps } from "./Button";

import {
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type DialogSize =
  | "sm"
  | "md"
  | "lg";

type IconComponent = ComponentType<
  SVGProps<SVGSVGElement>
>;

interface DialogProps {
  open: boolean;
  setOpen: (value: boolean) => void;

  title: string;
  description?: string;

  size?: DialogSize;

  icon?: IconComponent;
  iconClassName?: string;

  closeButton?: boolean;

  primaryButton?: ButtonProps;
  secondaryButton?: ButtonProps;

  children?: ReactNode;
}

interface SectionProps {
  children: ReactNode;
}

interface WarningProps {
  title: string;
  description: string;
}

const sizes: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};


function Body({
  children,
}: SectionProps) {
  return (
    <div className="mt-6">
      {children}
    </div>
  );
}

Body.displayName = "DialogBody";


function Form({
  children,
}: SectionProps) {
  return (
    <form className="mt-6 space-y-4">
      {children}
    </form>
  );
}

Form.displayName = "DialogForm";


function Row({
  children,
}: SectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {children}
    </div>
  );
}

Row.displayName = "DialogRow";


function Separator() {
  return (
    <div className="my-6 h-px bg-ctp-surface0" />
  );
}

Separator.displayName = "DialogSeparator";


function Warning({
  title,
  description,
}: WarningProps) {
  return (
    <div
      className="
        mt-6
        flex
        items-start
        gap-3
        rounded-2xl
        border
        border-ctp-yellow/20
        bg-ctp-yellow/10
        p-4
        text-sm
        text-ctp-yellow
      "
    >
      <ExclamationTriangleIcon
        className="mt-0.5 h-5 w-5 shrink-0"
        aria-hidden="true"
      />

      <div>
        <p className="font-medium">
          {title}
        </p>

        <p className="mt-1 text-ctp-yellow/80">
          {description}
        </p>
      </div>
    </div>
  );
}

Warning.displayName = "DialogWarning";


export default function Dialog({
  open,
  setOpen,

  title,
  description,

  size = "md",

  icon: Icon,
  iconClassName = "bg-ctp-surface0 text-ctp-text",

  closeButton = true,

  primaryButton,
  secondaryButton,

  children,
}: DialogProps) {
  return (
    <HeadlessDialog
      open={open}
      onClose={setOpen}
      className="relative z-100"
    >
      <div
        className="
          fixed
          inset-0
          bg-black/50
          backdrop-blur-sm
        "
        aria-hidden="true"
      />

      <div
        className="
          fixed
          inset-0
          flex
          items-center
          justify-center
          overflow-y-auto
          p-4
          sm:p-6
        "
      >
        <DialogPanel
          className={[
            "w-full",
            sizes[size],
            "rounded-3xl",
            "border",
            "border-ctp-surface0",
            "bg-ctp-mantle/95",
            "p-5",
            "shadow-2xl",
            "backdrop-blur-xl",
            "sm:p-6",
          ].join(" ")}
        >
          <div className="flex items-start gap-4">
            {Icon && (
              <div
                className={[
                  "flex",
                  "h-12",
                  "w-12",
                  "shrink-0",
                  "items-center",
                  "justify-center",
                  "rounded-2xl",
                  iconClassName,
                ].join(" ")}
              >
                <Icon
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </div>
            )}

            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-ctp-text">
                {title}
              </DialogTitle>

              {description && (
                <p className="mt-1.5 text-sm leading-relaxed text-ctp-subtext0">
                  {description}
                </p>
              )}
            </div>

            {closeButton && (
              <Button
                variant="ghost"
                size="sm"
                icon={XMarkIcon}
                iconOnly
                aria-label="Close dialog"
                onClick={() => setOpen(false)}
              />
            )}
          </div>


          {children}


          {(primaryButton || secondaryButton) && (
            <div
              className="
                mt-6
                flex
                flex-col
                gap-3
                sm:flex-row
              "
            >
              {secondaryButton && (
                <Button
                  {...secondaryButton}
                  className={[
                    "w-full",
                    secondaryButton.className ?? "",
                  ].join(" ")}
                />
              )}

              {primaryButton && (
                <Button
                  {...primaryButton}
                  className={[
                    "w-full",
                    primaryButton.className ?? "",
                  ].join(" ")}
                />
              )}
            </div>
          )}
        </DialogPanel>
      </div>
    </HeadlessDialog>
  );
}


Dialog.Body = Body;
Dialog.Form = Form;
Dialog.Row = Row;
Dialog.Warning = Warning;
Dialog.Separator = Separator;
