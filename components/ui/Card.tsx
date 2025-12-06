import React, { forwardRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

// ============================================
// CARD COMPONENT - Modern Design System
// ============================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "outlined" | "ghost";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  clickable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "default",
      padding = "md",
      hover = false,
      clickable = false,
      className,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: clsx(
        "bg-white dark:bg-slate-800",
        "border border-slate-200 dark:border-slate-700"
      ),
      elevated: clsx(
        "bg-white dark:bg-slate-800",
        "shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50",
        "border border-slate-100 dark:border-slate-700"
      ),
      outlined: clsx(
        "bg-transparent",
        "border-2 border-slate-200 dark:border-slate-700"
      ),
      ghost: clsx(
        "bg-slate-50 dark:bg-slate-800/50",
        "border border-transparent"
      ),
    };

    const paddingStyles = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "rounded-2xl",
            "transition-all duration-200",
            variantStyles[variant],
            paddingStyles[padding],
            hover && "hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1",
            clickable && "cursor-pointer"
          ),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// ============================================
// CARD HEADER
// ============================================

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge("mb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

// ============================================
// CARD TITLE
// ============================================

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, as: Component = "h3", className, ...props }, ref) => (
    <Component
      ref={ref}
      className={twMerge(
        "text-lg font-semibold text-slate-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
);

CardTitle.displayName = "CardTitle";

// ============================================
// CARD DESCRIPTION
// ============================================

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={twMerge(
        "text-sm text-slate-500 dark:text-slate-400 mt-1",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = "CardDescription";

// ============================================
// CARD CONTENT
// ============================================

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={twMerge("", className)} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

// ============================================
// CARD FOOTER
// ============================================

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(
        "mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = "CardFooter";

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
}) => {
  const changeColors = {
    positive: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    negative: "text-red-500 bg-red-50 dark:bg-red-500/10",
    neutral: "text-slate-500 bg-slate-50 dark:bg-slate-500/10",
  };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
          {change && (
            <span
              className={clsx(
                "inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
                changeColors[changeType]
              )}
            >
              {changeType === "positive" && (
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {changeType === "negative" && (
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {change}
            </span>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Card;
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
};
export type { CardProps, StatCardProps };
