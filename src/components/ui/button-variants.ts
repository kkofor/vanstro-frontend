import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "vs-ui-button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "vs-ui-button-primary",
        secondary: "vs-ui-button-secondary",
        ghost: "vs-ui-button-ghost",
        destructive: "vs-ui-button-destructive",
        link: "vs-ui-button-link"
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3",
        lg: "h-12 px-5",
        icon: "size-11 p-0"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;
