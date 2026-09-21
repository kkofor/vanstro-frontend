/**
 * components/checkout/checkout-stepper.tsx
 * Three-step header stepper: Shipping → Review → Payment.
 * Completed steps are buttons (go back and edit); future steps are inert.
 * Uses <nav aria-label> + aria-current so screen readers announce position.
 */
"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type CheckoutStep = 1 | 2 | 3

export interface CheckoutStepperProps {
  current: CheckoutStep
  /** Highest step the shopper has validated; steps ≤ this are clickable. */
  maxReached: CheckoutStep
  onJump: (step: CheckoutStep) => void
  locale?: "en-CA" | "fr-CA"
  className?: string
}

const LABELS = {
  "en-CA": ["Shipping", "Review", "Payment"],
  "fr-CA": ["Livraison", "Vérification", "Paiement"],
} as const

export function CheckoutStepper({ current, maxReached, onJump, locale = "en-CA", className }: CheckoutStepperProps) {
  const labels = LABELS[locale]
  return (
    <nav aria-label={locale === "fr-CA" ? "Étapes du paiement" : "Checkout steps"} className={cn("flex items-center gap-2", className)}>
      <ol className="flex items-center gap-2">
        {labels.map((label, i) => {
          const n = (i + 1) as CheckoutStep
          const done = n < current
          const active = n === current
          const reachable = n <= maxReached && !active
          return (
            <li key={n} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onJump(n)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-colors",
                  active && "font-semibold text-foreground",
                  done && "text-foreground hover:bg-brand-grey-50",
                  !active && !done && "text-muted-foreground",
                  "disabled:cursor-default"
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                    active && "bg-brand-navy text-white",
                    done && "bg-accent text-white",
                    !active && !done && "border border-brand-grey-300 text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-3.5" /> : n}
                </span>
                {label}
              </button>
              {i < labels.length - 1 && <span aria-hidden className={cn("h-px w-6 sm:w-10", n < current ? "bg-accent" : "bg-brand-grey-100")} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
