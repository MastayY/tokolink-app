import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "accent";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-foreground text-background hover:bg-foreground/90",
  outline: "border border-border bg-background text-foreground hover:bg-surface",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/40",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  accent: "bg-accent text-foreground hover:bg-accent/90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-full",
  md: "px-5 py-2.5 text-sm rounded-full",
  lg: "px-6 py-3.5 text-sm rounded-full",
  icon: "h-9 w-9 rounded-full flex items-center justify-center",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition duration-200 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner size="sm" className="border-current border-t-transparent" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
