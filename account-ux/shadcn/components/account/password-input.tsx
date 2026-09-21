/**
 * components/account/password-input.tsx
 * Input + show/hide toggle + optional Caps Lock hint + optional strength meter.
 * Used by: login, forgot-password step 3, account › change password.
 */
"use client"

import * as React from "react"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PASSWORD_RULES, passwordStrength } from "@/lib/validators"

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showStrength?: boolean
  capsLockHint?: boolean
  labels?: { show: string; hide: string; capsLock: string }
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showStrength = false,
      capsLockHint = true,
      labels = { show: "Show password", hide: "Hide password", capsLock: "Caps Lock is on" },
      value,
      onKeyUp,
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = React.useState(false)
    const [caps, setCaps] = React.useState(false)
    const str = showStrength ? passwordStrength(String(value ?? "")) : null

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn("pr-12", className)}
            value={value}
            autoCapitalize="off"
            spellCheck={false}
            onKeyUp={(e) => {
              if (capsLockHint) setCaps(e.getModifierState?.("CapsLock") ?? false)
              onKeyUp?.(e)
            }}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
            aria-label={visible ? labels.hide : labels.show}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff /> : <Eye />}
          </Button>
        </div>

        {capsLockHint && caps ? (
          <p className="text-xs font-semibold text-brand-orange-foreground">{labels.capsLock}</p>
        ) : null}

        {str ? (
          <div aria-live="polite">
            {/* 4‑segment meter */}
            <div className="mb-2 grid grid-cols-4 gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={str.score} aria-label="Password strength">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full bg-brand-grey-100 transition-colors",
                    i < str.score && (str.score <= 1 ? "bg-destructive" : str.score === 2 ? "bg-brand-orange" : "bg-accent")
                  )}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {PASSWORD_RULES.map((r) => {
                const ok = r.test(String(value ?? ""))
                return (
                  <li key={r.id} className={cn("flex items-center gap-1.5", ok && "text-accent")}>
                    {ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5 opacity-50" aria-hidden />}
                    {r.label}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"
