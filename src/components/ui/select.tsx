"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { useFieldControlProps } from "./field";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, ...props },
  ref
) {
  const controlProps = useFieldControlProps(props);
  const invalid = controlProps["aria-invalid"] === true || controlProps["aria-invalid"] === "true";

  return (
    <select
      ref={ref}
      className={cn("vs-ui-select h-11 w-full min-w-0 px-3", className)}
      data-slot="select"
      data-invalid={invalid ? "true" : undefined}
      {...controlProps}
    />
  );
});
