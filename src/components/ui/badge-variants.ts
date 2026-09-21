import { cva, type VariantProps } from "class-variance-authority";

export const badgeVariants = cva(
  "vs-ui-badge inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap px-2 py-0.5",
  {
    variants: {
      variant: {
        neutral: "vs-ui-badge-neutral",
        success: "vs-ui-badge-success",
        warning: "vs-ui-badge-warning",
        error: "vs-ui-badge-error",
        info: "vs-ui-badge-info",
        readiness: "vs-ui-badge-readiness"
      }
    },
    defaultVariants: {
      variant: "neutral"
    }
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
