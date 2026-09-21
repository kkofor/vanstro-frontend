"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";
import { useFieldControlProps } from "./field";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling";
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref
) {
  const controlProps = useFieldControlProps(props);
  const invalid = controlProps["aria-invalid"] === true || controlProps["aria-invalid"] === "true";

  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn("vs-ui-checkbox size-4 shrink-0", className)}
      data-slot="checkbox"
      data-invalid={invalid ? "true" : undefined}
      {...controlProps}
    />
  );
});
