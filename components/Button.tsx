import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  SVGProps,
} from "react";
import Link from "next/link";
import Image from "next/image";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

type ButtonSize =
  | "sm"
  | "md"
  | "lg";

type IconComponent = ComponentType<
  SVGProps<SVGSVGElement>
>;

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconComponent;
  iconSrc?: string;
  href?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary: [
    "border border-ctp-instance",
    "bg-ctp-instance",
    "text-ctp-base",
    "shadow-sm",
    "hover:border-ctp-instance-secondary",
    "hover:bg-ctp-instance-secondary",
    "hover:shadow",
  ].join(" "),

  secondary: [
    "border border-ctp-surface1",
    "bg-ctp-surface0/70",
    "backdrop-blur-sm",
    "text-ctp-text",
    "shadow-sm",
    "hover:border-ctp-surface2",
    "hover:bg-ctp-surface1",
    "hover:shadow",
  ].join(" "),

  ghost: [
    "border border-transparent",
    "bg-transparent",
    "text-ctp-subtext1",
    "hover:bg-ctp-surface0",
    "hover:text-ctp-text",
  ].join(" "),

  danger: [
    "border border-ctp-red",
    "bg-ctp-red",
    "text-ctp-base",
    "shadow-sm",
    "hover:bg-red-500",
    "hover:border-red-500",
    "hover:shadow",
  ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export default function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon: Icon,
  iconSrc,
  children,
  disabled,
  href,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonClass = [
    "group",
    "inline-flex items-center justify-center",
    size === "lg" ? "gap-2" : "gap-1.5",
    "rounded-xl",
    "font-medium",
    "leading-none",
    "select-none",
    "whitespace-nowrap",
    "cursor-pointer",
    "transition-[background-color,border-color,color,box-shadow,transform,opacity]",
    "duration-150",
    "ease-out",
    "motion-safe:hover:-translate-y-px",
    "motion-safe:active:translate-y-0",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-ctp-instance/70",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-offset-ctp-crust",
    "disabled:pointer-events-none",
    "disabled:cursor-not-allowed",
    "disabled:opacity-50",
    "disabled:saturate-50",
    "disabled:shadow-none",
    "disabled:translate-y-0",
    sizes[size],
    variants[variant],
    className,
  ].join(" ");

  const content = (
    <>
      {(loading || Icon || iconSrc) && (
        <span className="inline-flex shrink-0 items-center justify-center self-center leading-none">
          {loading ? (
            <ArrowPathIcon
              className="h-5 w-5 animate-spin"
            />
          ) : iconSrc ? (
            <Image
              src={iconSrc}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5"
            />
          ) : (
            Icon && (
              <Icon
                className="
                  relative
                  top-px
                  h-5 w-5
                  transition-transform
                  duration-150
                  motion-safe:group-hover:scale-110
                "
              />
            )
          )}
        </span>
      )}

      {children && (
        <span className="inline-flex items-center leading-none">
          {children}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={buttonClass}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      disabled={isDisabled}
      className={buttonClass}
      {...props}
    >
      {content}
    </button>
  );
}
