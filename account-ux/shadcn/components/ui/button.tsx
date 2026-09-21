/**
 * components/ui/button.tsx — shadcn Button with VANSTRO variants.
 * Diff vs. stock shadcn: + google / apple / accent / danger-outline variants,
 * `control` (46px) default size, `loading` prop.
 */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-bold transition-colors " +
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 " +
    "disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none " +
    "[&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-navy-700",
        /** Alias of `default` — the storefront (vanity-selector) layout components use `variant="primary"`. */
        primary: "bg-primary text-primary-foreground hover:bg-brand-navy-700",
        secondary: "bg-background text-primary border-primary hover:bg-secondary",
        ghost: "text-primary hover:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline h-auto p-0 font-bold",
        accent: "bg-accent text-accent-foreground hover:brightness-95",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "danger-outline": "bg-background text-destructive border-destructive hover:bg-brand-error-50",
        // Third‑party sign‑in — colours per Google / Apple brand guidelines; never re‑tint.
        google: "bg-white text-[#1f1f1f] border-[#dadce0] font-semibold hover:bg-[#f8f9fa] hover:border-[#c6c9cc]",
        apple: "bg-black text-white border-black font-semibold hover:bg-[#1a1a1a]",
      },
      size: {
        control: "h-control px-5 text-[15px]",        // 46px · forms
        sm: "h-9 px-3.5 text-sm rounded-sm",          // 36px · inline card actions
        icon: "size-9 rounded-sm",
        block: "h-control w-full px-5 text-[15px]",
      },
    },
    defaultVariants: { variant: "default", size: "control" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        <span className={cn(loading && "sr-only")}>{children}</span>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
