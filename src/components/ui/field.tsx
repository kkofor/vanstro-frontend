"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode
} from "react";
import { cn } from "./cn";

type FieldContextValue = {
  controlId: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

function joinIds(...values: Array<string | undefined>): string | undefined {
  const ids = values.flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? []);
  return ids.length > 0 ? Array.from(new Set(ids)).join(" ") : undefined;
}

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling";
};

export function useFieldControlProps<T extends FieldControlProps>(
  props: T
): T & FieldControlProps {
  const field = useContext(FieldContext);
  if (!field) return props;

  return {
    ...props,
    // Field owns the control id: label htmlFor, description and error ids are
    // all derived from field.controlId, so a child-provided id would break the
    // label association. Consumers set the id via Field's controlId prop.
    id: field.controlId,
    required: props.required ?? field.required,
    "aria-describedby": joinIds(
      props["aria-describedby"],
      field.descriptionId,
      field.errorId
    ),
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined)
  };
}

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  controlId?: string;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    children,
    label,
    description,
    error,
    required = false,
    controlId,
    className,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const resolvedControlId = controlId ?? `field-${generatedId}`;
  const hasDescription = description !== undefined && description !== null;
  const hasError = error !== undefined && error !== null;
  const descriptionId = hasDescription ? `${resolvedControlId}-description` : undefined;
  const errorId = hasError ? `${resolvedControlId}-error` : undefined;
  const context: FieldContextValue = {
    controlId: resolvedControlId,
    descriptionId,
    errorId,
    invalid: hasError,
    required
  };

  return (
    <FieldContext.Provider value={context}>
      <div
        ref={ref}
        className={cn("vs-ui-field grid gap-1.5", className)}
        data-slot="field"
        data-invalid={hasError ? "true" : undefined}
        {...props}
      >
        {label !== undefined && label !== null ? <FieldLabel>{label}</FieldLabel> : null}
        {children}
        {hasDescription ? <FieldDescription>{description}</FieldDescription> : null}
        {hasError ? <FieldError>{error}</FieldError> : null}
      </div>
    </FieldContext.Provider>
  );
});

export type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(function FieldLabel(
  { className, htmlFor, children, ...props },
  ref
) {
  const field = useContext(FieldContext);
  return (
    <label
      ref={ref}
      className={cn("vs-ui-field-label inline-flex items-center gap-1", className)}
      data-slot="field-label"
      htmlFor={htmlFor ?? field?.controlId}
      {...props}
    >
      {children}
      {field?.required ? (
        <span className="vs-ui-field-required" data-slot="field-required" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
});

export type FieldDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const FieldDescription = forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  function FieldDescription({ className, id, ...props }, ref) {
    const field = useContext(FieldContext);
    return (
      <p
        ref={ref}
        className={cn("vs-ui-field-description", className)}
        data-slot="field-description"
        id={id ?? field?.descriptionId}
        {...props}
      />
    );
  }
);

export type FieldErrorProps = HTMLAttributes<HTMLParagraphElement>;

export const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(function FieldError(
  { className, id, role = "alert", ...props },
  ref
) {
  const field = useContext(FieldContext);
  return (
    <p
      ref={ref}
      className={cn("vs-ui-field-error", className)}
      data-slot="field-error"
      id={id ?? field?.errorId}
      role={role}
      {...props}
    />
  );
});
