/**
 * components/account/address-card.tsx
 * One saved address in the address book (Canada Post display format).
 */
import * as React from "react"
import { Truck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Address } from "@/lib/validators"
import { formatPhoneCA } from "@/lib/validators"

export interface AddressCardProps {
  address: Address
  isDefaultShipping?: boolean
  isDefaultBilling?: boolean
  onEdit: (a: Address) => void
  onRemove: (a: Address) => void
  onSetDefault: (a: Address, type: "shipping" | "billing") => void
  t?: typeof EN
}

const EN = {
  defaultShipping: "Default shipping",
  defaultBilling: "Default billing",
  edit: "Edit",
  remove: "Remove",
  setShipping: "Set default shipping",
  setBilling: "Set default billing",
}

export function AddressCard({ address: a, isDefaultShipping, isDefaultBilling, onEdit, onRemove, onSetDefault, t = EN }: AddressCardProps) {
  return (
    <Card className={cn("flex flex-col gap-3 p-5", isDefaultShipping && "border-primary ring-1 ring-primary")}>
      <div className="flex flex-wrap items-center gap-2">
        {a.label ? <strong className="text-[15px]">{a.label}</strong> : null}
        {isDefaultShipping ? <Badge variant="navy">{t.defaultShipping}</Badge> : null}
        {isDefaultBilling ? <Badge variant="green">{t.defaultBilling}</Badge> : null}
      </div>

      <address className="not-italic leading-6 text-text-secondary">
        <strong className="text-foreground">{a.name}</strong>
        {a.company ? <><br />{a.company}</> : null}
        <br />{a.street}{a.unit ? `, ${a.unit}` : ""}
        <br />{a.city} {a.province}&nbsp; {a.postalCode}
        <br />Canada
        {a.phone ? <><br />+1 {formatPhoneCA(a.phone)}</> : null}
      </address>

      {a.notes ? (
        <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          <Truck className="mt-0.5 size-4 shrink-0" aria-hidden /> {a.notes}
        </p>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-brand-grey-100 pt-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(a)}>{t.edit}</Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-brand-error-50" onClick={() => onRemove(a)}>{t.remove}</Button>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!isDefaultShipping ? <Button variant="link" size="sm" onClick={() => onSetDefault(a, "shipping")}>{t.setShipping}</Button> : null}
          {!isDefaultBilling ? <Button variant="link" size="sm" onClick={() => onSetDefault(a, "billing")}>{t.setBilling}</Button> : null}
        </div>
      </div>
    </Card>
  )
}
