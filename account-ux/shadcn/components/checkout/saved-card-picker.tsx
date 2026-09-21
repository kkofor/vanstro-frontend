/**
 * components/checkout/saved-card-picker.tsx
 * Step 3 payment method: saved Vault cards (CVV re-entry only) or "New card"
 * which reveals <MonerisHostedFields/>. Vault tokens are Moneris data keys; the
 * CVV typed here is passed through to the server-side Purchase call and never stored.
 */
"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CardBrandBadge } from "@/components/account/card-brand-badge"
import { cn } from "@/lib/utils"
import { CVC_LENGTH, expiryState, type CardBrand } from "@/lib/validators"

export interface SavedCard {
  token: string
  brand: CardBrand
  last4: string
  expMonth: number
  expYear: number
  isDefault?: boolean
}

export type PaymentSelection = { method: "saved"; cardToken: string; cvv: string } | { method: "new" }

export interface SavedCardPickerProps {
  cards: SavedCard[]
  value: PaymentSelection
  onChange: (v: PaymentSelection) => void
  /** Bank decline for the selected saved card, shown inline so the shopper switches cards. */
  declineMessage?: string
  locale?: "en-CA" | "fr-CA"
  className?: string
}

export function SavedCardPicker({ cards, value, onChange, declineMessage, locale = "en-CA", className }: SavedCardPickerProps) {
  const fr = locale === "fr-CA"
  const selectedToken = value.method === "saved" ? value.cardToken : "new"

  return (
    <RadioGroup
      value={selectedToken}
      onValueChange={(v) => onChange(v === "new" ? { method: "new" } : { method: "saved", cardToken: v, cvv: "" })}
      className={cn("space-y-2", className)}
      aria-label={fr ? "Mode de paiement" : "Payment method"}
    >
      {cards.map((c) => {
        const exp = expiryState(c.expMonth, c.expYear)
        const selected = selectedToken === c.token
        const disabled = exp === "expired"
        return (
          <label
            key={c.token}
            className={cn(
              "flex flex-col gap-3 rounded-md border p-3 transition-colors",
              selected ? "border-brand-navy ring-1 ring-brand-navy" : "border-brand-grey-100 hover:border-brand-grey-300",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value={c.token} disabled={disabled} aria-label={`${c.brand} ending ${c.last4}`} />
              <CardBrandBadge brand={c.brand} size="sm" />
              <span className="text-sm">
                <span className="capitalize">{c.brand}</span> •••• {c.last4}
                <span className="ml-2 text-xs text-muted-foreground">
                  {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}
                </span>
              </span>
              <span className="ml-auto flex gap-1.5">
                {c.isDefault && <Badge variant="neutral">{fr ? "Par défaut" : "Default"}</Badge>}
                {exp === "soon" && <Badge variant="orange">{fr ? "Expire bientôt" : "Expires soon"}</Badge>}
                {exp === "expired" && <Badge variant="error">{fr ? "Expirée" : "Expired"}</Badge>}
              </span>
            </div>

            {selected && value.method === "saved" && (
              <div className="grid gap-1.5 pl-8 sm:max-w-[220px]">
                <label htmlFor={`cvv-${c.token}`} className="text-xs font-medium">
                  {fr ? "Code de sécurité" : "Security code"}{" "}
                  <span className="text-muted-foreground">
                    ({CVC_LENGTH[c.brand]} {fr ? "chiffres" : "digits"})
                  </span>
                </label>
                <Input
                  id={`cvv-${c.token}`}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={CVC_LENGTH[c.brand]}
                  value={value.cvv}
                  onChange={(e) => onChange({ ...value, cvv: e.target.value.replace(/\D/g, "") })}
                  aria-invalid={!!declineMessage}
                  className="font-mono tracking-widest"
                />
                {declineMessage && (
                  <p role="alert" className="text-xs text-brand-red">
                    {declineMessage} {fr ? "Essayez une autre carte." : "Try another card."}
                  </p>
                )}
              </div>
            )}
          </label>
        )
      })}

      <label
        className={cn(
          "flex items-center gap-3 rounded-md border p-3 transition-colors",
          selectedToken === "new" ? "border-brand-navy ring-1 ring-brand-navy" : "border-brand-grey-100 hover:border-brand-grey-300"
        )}
      >
        <RadioGroupItem value="new" aria-label={fr ? "Nouvelle carte" : "New card"} />
        <span className="inline-flex size-9 items-center justify-center rounded-[4px] border border-dashed border-brand-grey-300 text-muted-foreground">
          <Plus className="size-4" aria-hidden />
        </span>
        <span className="text-sm">
          {fr ? "Payer avec une nouvelle carte" : "Pay with a new card"}
          <span className="block text-xs text-muted-foreground">{fr ? "Saisie sécurisée par Moneris" : "Entered securely with Moneris"}</span>
        </span>
      </label>
    </RadioGroup>
  )
}
