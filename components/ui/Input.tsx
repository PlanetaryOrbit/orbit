import React, { forwardRef, ReactNode } from "react";
import { UseFormRegister, useFormContext } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

// ============================================
// INPUT COMPONENT - Modern Design System
// ============================================

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  inputSize?: "sm" | "md" | "lg";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconPosition = "left",
      inputSize = "md",
      className,
      id,
      name,
      disabled,
      ...props
    },
    ref
  ) => {
    // Try to get errors from form context if available
    const formContext = useFormContext();
    const formError = formContext?.formState?.errors?.[name as string]?.message as string | undefined;
    const displayError = error || formError;

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2.5 text-sm",
      lg: "px-5 py-3 text-base",
    };

    const iconPadding = {
      sm: iconPosition === "left" ? "pl-8" : "pr-8",
      md: iconPosition === "left" ? "pl-10" : "pr-10",
      lg: iconPosition === "left" ? "pl-12" : "pr-12",
    };

    const iconSize = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    const iconPositionStyles = {
      left: "left-3",
      right: "right-3",
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div
              className={clsx(
                "absolute top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none",
                iconPositionStyles[iconPosition]
              )}
            >
              <span className={iconSize[inputSize]}>{icon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            id={id}
            name={name}
            disabled={disabled}
            className={twMerge(
              clsx(
                // Base styles
                "w-full rounded-xl",
                "bg-white dark:bg-slate-800",
                "text-slate-900 dark:text-white",
                "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                "border border-slate-200 dark:border-slate-700",
                "transition-all duration-200",
                
                // Focus styles
                "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                "dark:focus:ring-indigo-400/20 dark:focus:border-indigo-400",
                
                // Hover styles
                "hover:border-slate-300 dark:hover:border-slate-600",
                
                // Disabled styles
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-900",
                
                // Error styles
                displayError && "border-red-500 dark:border-red-400 focus:ring-red-500/20 focus:border-red-500",
                
                // Size styles
                sizeStyles[inputSize],
                
                // Icon padding
                icon && iconPadding[inputSize]
              ),
              className
            )}
            {...props}
          />
        </div>
        
        {displayError && (
          <p className="mt-1.5 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {displayError}
          </p>
        )}
        
        {hint && !displayError && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// ============================================
// TEXTAREA COMPONENT
// ============================================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, name, disabled, ...props }, ref) => {
    const formContext = useFormContext();
    const formError = formContext?.formState?.errors?.[name as string]?.message as string | undefined;
    const displayError = error || formError;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={id}
          name={name}
          disabled={disabled}
          className={twMerge(
            clsx(
              // Base styles
              "w-full rounded-xl px-4 py-3 text-sm",
              "bg-white dark:bg-slate-800",
              "text-slate-900 dark:text-white",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "border border-slate-200 dark:border-slate-700",
              "transition-all duration-200",
              "resize-none",
              
              // Focus styles
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
              
              // Hover styles
              "hover:border-slate-300 dark:hover:border-slate-600",
              
              // Disabled styles
              "disabled:opacity-50 disabled:cursor-not-allowed",
              
              // Error styles
              displayError && "border-red-500 focus:ring-red-500/20 focus:border-red-500"
            ),
            className
          )}
          {...props}
        />
        
        {displayError && (
          <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {displayError}
          </p>
        )}
        
        {hint && !displayError && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Input;
export { Input, Textarea };
export type { InputProps, TextareaProps };
