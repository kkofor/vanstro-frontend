"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";
import { useFieldControlProps } from "./field";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref
) {
  const controlProps = useFieldControlProps(props);
  const invalid = controlProps["aria-invalid"] === true || controlProps["aria-invalid"] === "true";

  return (
    <textarea
      ref={ref}
      className={cn("vs-ui-textarea min-h-24 w-full min-w-0 px-3 py-2.5", className)}
      data-slot="textarea"
      data-invalid={invalid ? "true" : undefined}
      {...controlProps}
    />
  );
});
