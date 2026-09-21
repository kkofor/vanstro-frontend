/**
 * components/checkout/moneris-hosted-fields.tsx
 * Our own "card box" wrapping the Moneris Hosted Tokenization (HT) iframe.
 *
 * PCI: card number / expiry / CVV are typed inside a single small Moneris iframe that we style
 * (via query-string CSS) to look like the rest of the form. This component never sees them.
 * It only: builds the iframe URL, listens for the postMessage reply, and exposes `tokenize()`
 * through a ref.
 *
 * Flow: parent calls ref.tokenize() on Pay → { dataKey } → POST /api/orders → POST
 * /api/checkout/moneris/pay { orderNo, temporaryToken }. The temporary token is single use and
 * lives ~15 minutes; call ref.reset() (reloads the frame) before another attempt.
 *
 * Reference: assets/moneris-client.js htMount() — keep param names / CSS in sync.
 */
"use client"

import * as React from "react"
import { Loader2, LockKeyhole } from "lucide-react"
import { Alert } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type MonerisEnv = "qa" | "prod"

/** Moneris HT response codes. 943/944/945 are per-field validation errors. */
export const HT_ERRORS: Record<string, { en: string; fr: string; field?: "pan" | "exp" | "cvd" }> = {
  "940": { en: "Payment form could not start (profile). Please refresh.", fr: "Le formulaire de paiement n’a pas pu démarrer (profil). Actualisez la page." },
  "941": { en: "Could not secure your card details. Please try again.", fr: "Impossible de sécuriser vos données de carte. Réessayez." },
  "942": { en: "Payment form is not allowed on this page (origin). Please refresh.", fr: "Le formulaire de paiement n’est pas autorisé sur cette page (origine). Actualisez la page." },
  "943": { en: "Check the card number.", fr: "Vérifiez le numéro de carte.", field: "pan" },
  "944": { en: "Check the expiry date (MM / YY).", fr: "Vérifiez la date d’expiration (MM / AA).", field: "exp" },
  "945": { en: "Check the security code.", fr: "Vérifiez le code de sécurité.", field: "cvd" },
}

export class HostedTokenizationError extends Error {
  codes: string[]
  fields: Array<"pan" | "exp" | "cvd">
  constructor(message: string, codes: string[], fields: Array<"pan" | "exp" | "cvd">) {
    super(message)
    this.codes = codes
    this.fields = fields
  }
}

export interface MonerisHostedFieldsHandle {
  /** Ask Moneris to tokenize what the shopper typed. Rejects with HostedTokenizationError. */
  tokenize(): Promise<{ dataKey: string; bin: string }>
  /** Reload the frame (temporary tokens are single use). */
  reset(): void
}

export interface MonerisHostedFieldsProps {
  /** From GET /api/checkout/payment-config → ht.url (per env). */
  url: string
  /** From GET /api/checkout/payment-config → ht.profileId (MRC → Admin → Hosted Tokenization). */
  profileId: string
  env: MonerisEnv
  locale?: "en-CA" | "fr-CA"
  /** Input text colour; defaults to the design-system ink. */
  color?: string
  onLoaded?: () => void
  onError?: (err: unknown) => void
  className?: string
}

const HT_FONT = '"HarmonyOS Sans","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'

function htParams(profileId: string, o: { color?: string; fr: boolean }) {
  const p = new URLSearchParams()
  p.set("id", profileId)
  p.set("pmmsg", "true")
  p.set("css_body", `margin:0;padding:0;background:transparent;font-family:${HT_FONT};`)
  p.set(
    "css_textbox",
    `box-sizing:border-box;float:left;height:44px;border:0;outline:0;background:transparent;margin:0;padding:0 14px;font-family:${HT_FONT};font-size:15px;color:${o.color ?? "#0a1614"};`
  )
  p.set("css_textbox_pan", "width:52%;")
  p.set("enable_exp", "1")
  p.set("css_textbox_exp", "width:26%;padding-left:8px;")
  p.set("enable_cvd", "1")
  p.set("css_textbox_cvd", "width:22%;padding-left:8px;")
  p.set("display_labels", "2") // placeholder labels; the visible label lives outside the frame
  p.set("pan_label", o.fr ? "Numéro de carte" : "Card number")
  p.set("exp_label", o.fr ? "MM / AA" : "MM / YY")
  p.set("cvd_label", "CVV")
  p.set("enable_cc_formatting", "1")
  p.set("enable_exp_formatting", "1")
  return p.toString()
}

export const MonerisHostedFields = React.forwardRef<MonerisHostedFieldsHandle, MonerisHostedFieldsProps>(function MonerisHostedFields(
  { url, profileId, env, locale = "en-CA", color, onLoaded, onError, className },
  ref
) {
  const fr = locale === "fr-CA"
  const [status, setStatus] = React.useState<"loading" | "ready" | "failed">("loading")
  const [nonce, setNonce] = React.useState(0) // bump to reload the iframe
  const frameRef = React.useRef<HTMLIFrameElement | null>(null)
  const pending = React.useRef<{ resolve: (v: { dataKey: string; bin: string }) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> } | null>(null)
  const origin = React.useMemo(() => new URL(url).origin, [url])
  const src = React.useMemo(() => `${url}?${htParams(profileId, { color, fr })}`, [url, profileId, color, fr])

  React.useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== origin || !pending.current) return
      let d: { responseCode?: string | string[]; dataKey?: string; bin?: string; errorMessage?: string }
      try {
        d = typeof e.data === "string" ? JSON.parse(e.data) : e.data
      } catch {
        return
      }
      if (!d || typeof d.responseCode === "undefined") return
      const p = pending.current
      pending.current = null
      clearTimeout(p.timer)
      const codes = Array.isArray(d.responseCode) ? d.responseCode : [String(d.responseCode)]
      if (codes.includes("001") && d.dataKey) {
        p.resolve({ dataKey: d.dataKey, bin: d.bin ?? "" })
        return
      }
      const bad = codes.filter((c) => c !== "001")
      const message = bad.map((c) => HT_ERRORS[c]?.[fr ? "fr" : "en"] ?? d.errorMessage ?? `Card error ${c}`).join(" ")
      const fields = bad.map((c) => HT_ERRORS[c]?.field).filter((f): f is "pan" | "exp" | "cvd" => !!f)
      p.reject(new HostedTokenizationError(message, bad, fields))
    }
    window.addEventListener("message", onMessage)
    return () => {
      window.removeEventListener("message", onMessage)
      failPending(fr ? "Le formulaire de paiement a été fermé." : "The payment form was closed.")
    }
  }, [origin, fr])

  /** Reject + clear any in-flight tokenize() (frame swapped or unmounted) so the Pay button never hangs on a dead promise. */
  function failPending(reason: string) {
    const p = pending.current
    if (!p) return
    pending.current = null
    clearTimeout(p.timer)
    p.reject(new Error(reason))
  }

  // <iframe onError> never fires for HTTP/CSP failures, so "failed" needs a load timeout; and
  // Moneris' own error page also fires onLoad, so "ready" waits for the frame to be visible AND loaded.
  React.useEffect(() => {
    if (status !== "loading") return
    const t = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "failed" : s))
      onError?.(new Error("Hosted Tokenization frame did not load within 10 s"))
    }, 10_000)
    return () => clearTimeout(t)
  }, [status, nonce, onError])

  React.useImperativeHandle(
    ref,
    () => ({
      tokenize() {
        return new Promise((resolve, reject) => {
          if (pending.current) return reject(new Error("Tokenization already in progress"))
          const win = frameRef.current?.contentWindow
          if (!win || status !== "ready") return reject(new Error(fr ? "Le formulaire de paiement n’est pas prêt." : "The payment form is not ready."))
          pending.current = {
            resolve,
            reject,
            timer: setTimeout(() => {
              if (pending.current) {
                pending.current = null
                reject(new Error(fr ? "Le formulaire de paiement n’a pas répondu. Réessayez." : "The payment form did not respond. Please try again."))
              }
            }, 15_000),
          }
          win.postMessage("tokenize", origin)
        })
      },
      reset() {
        failPending(fr ? "Le formulaire de paiement a été réinitialisé." : "The payment form was reset.")
        setStatus("loading")
        setNonce((n) => n + 1)
      },
    }),
    [origin, status, fr]
  )

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{fr ? "Détails de la carte" : "Card details"}</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <LockKeyhole className="size-3" aria-hidden />
          {fr ? "Sécurisé par Moneris" : "Secured by Moneris"}
          {env === "qa" && <span className="ml-1 rounded bg-brand-grey-100 px-1 text-[10px] uppercase tracking-wide">sandbox</span>}
        </span>
      </div>

      <div className="relative h-11 overflow-hidden rounded-md border border-brand-grey-200 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center gap-2 px-3.5 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {fr ? "Chargement…" : "Loading…"}
          </div>
        )}
        <iframe
          key={nonce}
          ref={frameRef}
          title={fr ? "Numéro de carte, expiration et code de sécurité (sécurisé par Moneris)" : "Card number, expiry and security code (secured by Moneris)"}
          src={src}
          allow="payment"
          scrolling="no"
          className={cn("block h-11 w-full border-0 bg-transparent", status !== "ready" && "invisible")}
          onLoad={() => {
            setStatus("ready")
            onLoaded?.()
          }}
          onError={(e) => {
            setStatus("failed")
            onError?.(e)
          }}
        />
      </div>

      {status === "failed" ? (
        <Alert variant="error">{fr ? "Le formulaire de paiement n’a pas pu être chargé. Rechargez le paiement pour réessayer." : "The payment form could not be loaded. Reload payment to try again."}</Alert>
      ) : (
        <p className="text-xs text-muted-foreground">
          {fr
            ? "Numéro, expiration et code de sécurité vont directement à Moneris depuis ce champ. Ils n’atteignent jamais nos serveurs."
            : "Number, expiry and security code go straight to Moneris from this field. They never reach our servers."}
        </p>
      )}
    </div>
  )
})
