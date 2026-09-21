/**
 * components/account/card-brand-badge.tsx
 * 48×32 (md) / 36×24 (sm) card-network mark. Brand colours are fixed by each
 * network's guidelines and must NOT be re-tinted with VI colours.
 */
import * as React from "react"
import { CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CardBrand } from "@/lib/validators"

export interface CardBrandBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  brand: CardBrand
  size?: "md" | "sm"
}

const LABEL: Record<CardBrand, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", unknown: "Card" }

export function CardBrandBadge({ brand, size = "md", className, ...props }: CardBrandBadgeProps) {
  return (
    <span
      role="img"
      aria-label={LABEL[brand]}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-brand-grey-100 bg-white",
        size === "md" ? "h-8 w-12" : "h-6 w-9",
        brand === "amex" && "bg-[#016fd0] border-[#016fd0]",
        className
      )}
      {...props}
    >
      {brand === "visa" && (
        <span className={cn("font-black italic tracking-tight text-[#1a1f71]", size === "md" ? "text-[15px]" : "text-[11px]")}>VISA</span>
      )}
      {brand === "mastercard" && (
        <span className={cn("relative block", size === "md" ? "h-4 w-7" : "h-3 w-5")}>
          <i className="absolute left-0 top-0 h-full aspect-square rounded-full bg-[#eb001b]" />
          <i className="absolute right-0 top-0 h-full aspect-square rounded-full bg-[#f79e1b] mix-blend-multiply" />
        </span>
      )}
      {brand === "amex" && (
        <span className={cn("font-black tracking-wide text-white", size === "md" ? "text-[9px]" : "text-[7px]")}>AMEX</span>
      )}
      {brand === "unknown" && <CreditCard className={cn("text-muted-foreground", size === "md" ? "size-5" : "size-4")} aria-hidden />}
    </span>
  )
}
