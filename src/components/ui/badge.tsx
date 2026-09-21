import { forwardRef, type HTMLAttributes } from "react";
import { badgeVariants, type BadgeVariant } from "./badge-variants";
import { cn } from "./cn";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant = "neutral", ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      data-slot="badge"
      data-variant={variant}
      {...props}
    />
  );
});

export { badgeVariants };
export type { BadgeVariant };
