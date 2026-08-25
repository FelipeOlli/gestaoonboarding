import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "muted";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "success" && "border-transparent bg-emerald-500/20 text-emerald-300",
        variant === "warning" && "border-transparent bg-amber-500/20 text-amber-300",
        variant === "danger" && "border-transparent bg-red-500/20 text-red-300",
        variant === "muted" && "border-transparent bg-muted text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
