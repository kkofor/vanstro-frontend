/**
 * components/ui/badge.tsx — status chips (Verified · Not verified · Default · Expired · EMAIL …).
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-bold uppercase tracking-[.06em] leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        navy: "bg-secondary text-primary",                       // Default · EMAIL / PHONE / USERNAME
        green: "bg-brand-green-50 text-accent",                  // Verified · Done
        orange: "bg-brand-orange-50 text-brand-orange-foreground", // Not verified · Expires soon · 60%
        error: "bg-brand-error-50 text-destructive",             // Expired · Locked
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "navy" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
