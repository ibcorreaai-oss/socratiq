import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// NOTE: intentionally a <span>, never a <div> — a div-based badge nested
// inside a <p>/<CardDescription> produces invalid HTML nesting that the
// browser silently repairs by moving nodes, causing server/client DOM
// mismatch (React hydration error #418). Span is inline-safe everywhere.
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/15 text-primary",
        gold: "border-gold/40 bg-gold/15 text-gold",
        success: "border-success/40 bg-success/15 text-success",
        danger: "border-danger/40 bg-danger/15 text-danger",
        muted: "border-border bg-white/5 text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
