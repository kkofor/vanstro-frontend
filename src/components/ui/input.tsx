"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";
import { useFieldControlProps } from "./field";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  const controlProps = useFieldControlProps(props);
  const invalid = controlProps["aria-invalid"] === true || controlProps["aria-invalid"] === "true";

  return (
    <input
      ref={ref}
      className={cn("vs-ui-input h-11 w-full min-w-0 px-3", className)}
      data-slot="input"
      data-invalid={invalid ? "true" : undefined}
      {...controlProps}
    />
  );
});
