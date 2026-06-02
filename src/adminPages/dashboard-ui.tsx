import * as React from "react";
import { X } from "lucide-react";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/components/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof UiInput>
>(({ className, ...props }, ref) => (
  <UiInput
    ref={ref}
    className={cn("rounded-xl font-bold text-right", className)}
    {...props}
  />
));
Input.displayName = "DashInput";

export const Badge = ({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof UiBadge>) => (
  <UiBadge variant={variant} className={cn("rounded-full", className)} {...props} />
);

type DashButtonProps = React.ComponentProps<typeof UiButton> & {
  variant?: "default" | "outline" | "ghost" | "gold" | "destructive" | "secondary";
};

export const Button = React.forwardRef<HTMLButtonElement, DashButtonProps>(
  ({ className, variant = "default", style, ...props }, ref) => {
    const isGold = variant === "gold";
    return (
      <UiButton
        ref={ref}
        variant={isGold ? "default" : (variant as React.ComponentProps<typeof UiButton>["variant"])}
        className={cn("rounded-xl font-bold active:scale-95", isGold && "text-white border-0", className)}
        style={isGold ? { background: "linear-gradient(135deg, #C9A355, #B8924A)", boxShadow: "0 4px 14px rgba(184,146,74,0.25)", ...style } : style}
        {...props}
      />
    );
  },
);
Button.displayName = "DashButton";

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
);

export function DashSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("dashboard-select w-full", className)} {...props}>
      {children}
    </select>
  );
}

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  mobileSheet?: boolean;
  tall?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function ModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = "max-w-4xl",
  mobileSheet = true,
  tall = false,
  children,
  footer,
}: ModalShellProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-[200] flex justify-center p-0 sm:p-4 overflow-y-auto no-print",
        mobileSheet ? "items-end sm:items-center" : "items-center",
      )}
    >
      <div
        className={cn(
          "bg-card w-full shadow-2xl relative overflow-hidden animate-in zoom-in duration-300 flex flex-col",
          mobileSheet ? "rounded-t-3xl sm:rounded-3xl" : "rounded-3xl",
          maxWidth,
          tall ? "h-[92vh] sm:h-[90vh] max-h-[95vh]" : "max-h-[95vh] sm:max-h-[90vh]",
        )}
      >
        <div className="p-4 sm:p-6 border-b bg-muted flex justify-between items-center text-right shrink-0" dir="rtl">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl hover:bg-card flex items-center justify-center transition-all bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}
