import React, { forwardRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

// ============================================
// BUTTON COMPONENT - Modern Design System
// ============================================

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gradient" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      "inline-flex items-center justify-center gap-2",
      "font-medium rounded-xl",
      "transition-all duration-200 ease-out",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
      fullWidth && "w-full"
    );

    const variantStyles: Record<ButtonVariant, string> = {
      primary: clsx(
        "bg-gradient-to-r from-indigo-500 to-indigo-600",
        "text-white shadow-sm",
        "hover:from-indigo-600 hover:to-indigo-700 hover:shadow-md hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-sm",
        "focus-visible:ring-indigo-500"
      ),
      gradient: clsx(
        "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
        "text-white shadow-lg",
        "hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5",
        "active:translate-y-0",
        "focus-visible:ring-purple-500"
      ),
      secondary: clsx(
        "bg-white dark:bg-slate-800",
        "text-slate-700 dark:text-slate-200",
        "border border-slate-200 dark:border-slate-700",
        "shadow-sm",
        "hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
        "focus-visible:ring-slate-500"
      ),
      ghost: clsx(
        "bg-transparent",
        "text-slate-600 dark:text-slate-300",
        "hover:bg-slate-100 dark:hover:bg-slate-800",
        "focus-visible:ring-slate-500"
      ),
      outline: clsx(
        "bg-transparent",
        "text-indigo-600 dark:text-indigo-400",
        "border-2 border-indigo-500 dark:border-indigo-400",
        "hover:bg-indigo-50 dark:hover:bg-indigo-500/10",
        "focus-visible:ring-indigo-500"
      ),
      danger: clsx(
        "bg-gradient-to-r from-red-500 to-red-600",
        "text-white shadow-sm",
        "hover:from-red-600 hover:to-red-700 hover:shadow-md",
        "focus-visible:ring-red-500"
      ),
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
      xl: "px-6 py-3 text-lg",
    };

    const iconSizeStyles: Record<ButtonSize, string> = {
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
      xl: "w-6 h-6",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className={clsx("animate-spin", iconSizeStyles[size])}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className={iconSizeStyles[size]}>{icon}</span>
            )}
            {children}
            {icon && iconPosition === "right" && (
              <span className={iconSizeStyles[size]}>{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
