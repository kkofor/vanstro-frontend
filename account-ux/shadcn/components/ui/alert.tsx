/**
 * components/ui/alert.tsx — shadcn Alert with the four VANSTRO feedback variants.
 * Stock shadcn only ships `default` / `destructive`; we need error / warning / success / info.
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative flex w-full gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-[18px] [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        error: "bg-brand-error-50 border-[#f1c9c2] text-[#8a2a1b] [&>svg]:text-destructive",
        warning: "bg-brand-orange-50 border-[#f7dcae] text-[#7a4a06] [&>svg]:text-[#d98a17]",
        success: "bg-brand-green-50 border-brand-green-100 text-[#0b5d48] [&>svg]:text-accent",
        info: "bg-secondary border-brand-navy-100 text-primary [&>svg]:text-primary",
      },
    },
    defaultVariants: { variant: "info" },
  }
)

const ICONS = { error: AlertCircle, warning: AlertTriangle, success: CheckCircle2, info: ShieldCheck } as const

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  icon?: React.ReactNode | false
}

export function Alert({ className, variant = "info", icon, children, ...props }: AlertProps) {
  const Icon = ICONS[variant ?? "info"]
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)} {...props}>
      {icon === false ? null : icon ?? <Icon aria-hidden />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <strong className={cn("mb-0.5 block font-bold", className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("[&_a]:font-bold [&_a]:underline-offset-2", className)} {...props} />
}
