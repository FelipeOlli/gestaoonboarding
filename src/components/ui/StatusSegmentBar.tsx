"use client";

import { cn } from "@/lib/utils";

export type SegmentActiveTone = "success" | "warning" | "danger";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  activeTone?: SegmentActiveTone;
};

const ACTIVE_TONE_CLASSES: Record<SegmentActiveTone, string> = {
  success: "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/60",
  warning: "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/60",
  danger: "bg-rose-600 text-white shadow-sm ring-1 ring-rose-400/60",
};

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
};

export function StatusSegmentBar<T extends string>({
  options,
  value,
  onChange,
  disabled,
  fullWidth,
  className,
}: Props<T>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/40 p-0.5",
        fullWidth ? "flex w-full" : "inline-flex",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      role="group"
    >
      {options.map((option) => {
        const active = value === option.value;
        const tone = option.activeTone ?? "success";

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
              fullWidth && "flex-1",
              active
                ? ACTIVE_TONE_CLASSES[tone]
                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
