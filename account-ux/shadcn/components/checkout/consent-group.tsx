/**
 * components/checkout/consent-group.tsx
 * Step 2 consent block. Two required acknowledgements (PIPEDA express consent for
 * the collection described in the privacy notice; Terms of Sale), one optional CASL
 * marketing opt-in (default OFF, never pre-checked), and the SMS receipt toggle.
 * Quebec destinations get the Law 25 notice inline.
 */
"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { Consent } from "@/lib/checkout"
import type { ProvinceCode } from "@/lib/tax"

export interface ConsentGroupProps {
  value: Consent
  onChange: (next: Consent) => void
  province: ProvinceCode
  /** Field errors from consentSchema.safeParse, keyed by field. */
  errors?: Partial<Record<keyof Consent, string>>
  hasPhone: boolean
  locale?: "en-CA" | "fr-CA"
  onOpenPrivacy: () => void
  className?: string
}

export function ConsentGroup({ value, onChange, province, errors, hasPhone, locale = "en-CA", onOpenPrivacy, className }: ConsentGroupProps) {
  const fr = locale === "fr-CA"
  const set = (k: keyof Consent) => (checked: boolean | "indeterminate") => onChange({ ...value, [k]: checked === true })

  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-sm font-semibold">{fr ? "Consentements" : "Before you pay"}</legend>

      {province === "QC" && (
        <Alert variant="warning">
          <b>Loi 25 (Québec).</b> Vos renseignements personnels sont recueillis pour traiter, livrer et facturer cette commande, et conservés au Canada.
          Responsable de la protection des renseignements personnels : privacy@vanstro.ca. Vous pouvez accéder à vos données, les corriger ou en demander la suppression.
        </Alert>
      )}

      <ConsentRow id="c-terms" checked={value.terms} onChange={set("terms")} required error={errors?.terms}>
        {fr ? "J’accepte les " : "I agree to the "}
        <a href="/legal/terms-of-sale" className="underline underline-offset-2" target="_blank" rel="noreferrer">
          {fr ? "Conditions de vente" : "Terms of Sale"}
        </a>
        {fr ? ", y compris la politique de retour de 30 jours." : ", including the 30‑day return policy."}
      </ConsentRow>

      <ConsentRow id="c-privacy" checked={value.privacy} onChange={set("privacy")} required error={errors?.privacy}>
        {fr ? "Je comprends comment Vanstro utilise mes renseignements, tel que décrit dans " : "I understand how Vanstro uses my information as described in the "}
        <button type="button" onClick={onOpenPrivacy} className="underline underline-offset-2">
          {fr ? "l’avis de confidentialité" : "checkout privacy notice"}
        </button>
        {fr
          ? " (traitement de la commande, livraison, facture conservée 6 ans pour l’ARC, Moneris pour le paiement)."
          : " (order processing, delivery, tax invoice kept 6 years for the CRA, Moneris for payment)."}
      </ConsentRow>

      <ConsentRow id="c-sms" checked={value.smsReceipt} onChange={set("smsReceipt")} disabled={!hasPhone} error={errors?.smsReceipt}>
        {fr ? "Envoyer aussi un lien de reçu par SMS" : "Also text me a receipt link"}
        {!hasPhone && <span className="text-muted-foreground"> · {fr ? "ajoutez un numéro mobile à l’étape 1" : "add a mobile number in step 1"}</span>}
      </ConsentRow>

      <ConsentRow id="c-marketing" checked={value.marketing} onChange={set("marketing")}>
        {fr
          ? "M’envoyer des offres et nouveautés par courriel (facultatif, désabonnement à tout moment). "
          : "Email me offers and new products (optional, unsubscribe any time). "}
        <span className="text-muted-foreground">
          Vanstro Global Supply Inc., Winnipeg MB · {fr ? "LCAP" : "CASL"}
        </span>
      </ConsentRow>
    </fieldset>
  )
}

function ConsentRow({
  id,
  checked,
  onChange,
  required,
  disabled,
  error,
  children,
}: {
  id: string
  checked: boolean
  onChange: (c: boolean | "indeterminate") => void
  required?: boolean
  disabled?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("rounded-md border p-3", error ? "border-brand-red bg-brand-red-50" : "border-brand-grey-100", disabled && "opacity-60")}>
      <label htmlFor={id} className="flex items-start gap-3 text-sm leading-relaxed">
        <Checkbox id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-required={required} aria-invalid={!!error} className="mt-0.5" />
        <span>
          {children}
          {required && <span aria-hidden className="ml-1 text-brand-red">*</span>}
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-2 pl-7 text-xs text-brand-red">
          {error}
        </p>
      )}
    </div>
  )
}
