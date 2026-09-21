import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  buttonVariants,
  type ButtonSize,
  type ButtonVariant
} from "./button-variants";
import { cn } from "./cn";

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  children?: ReactNode;
  asChild?: boolean;
};

type ButtonVariantProps = {
  variant?: ButtonVariant;
};
type NonIconButtonProps = NativeButtonProps &
  ButtonVariantProps & {
    size?: Exclude<ButtonSize, "icon">;
  };
type IconButtonProps = NativeButtonProps &
  ButtonVariantProps & {
    size: "icon";
    "aria-label": string;
  };

export type ButtonProps = NonIconButtonProps | IconButtonProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "default",
    loading = false,
    loadingLabel = "加载中",
    disabled,
    children,
    type = "button",
    asChild = false,
    ...props
  },
  ref
) {
  const Comp = asChild ? Slot : "button";
  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? (
        <span
          className="vs-ui-button-spinner size-4 shrink-0"
          data-slot="button-spinner"
          aria-hidden="true"
        />
      ) : null}
      <span data-slot="button-label" aria-hidden={loading || undefined}>
        {children}
      </span>
      {loading ? (
        <span className="sr-only" data-slot="button-loading-label">
          {loadingLabel}
        </span>
      ) : null}
    </>
  );

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={!asChild && loading ? "true" : undefined}
      aria-busy={!asChild && loading ? true : undefined}
      disabled={asChild ? undefined : disabled || loading}
      {...props}
    >
      {content}
    </Comp>
  );
});

export { buttonVariants };
export type { ButtonSize, ButtonVariant };
