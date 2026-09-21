import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

export type EmptyStateProps = Omit<ComponentPropsWithoutRef<"section">, "aria-label"> & {
  label: string;
};

export function EmptyState({ className, label, ...props }: EmptyStateProps) {
  return (
    <section
      aria-label={label}
      className={cn("vs-ui-empty-state flex flex-col items-center gap-3 p-6", className)}
      data-slot="empty-state"
      {...props}
    />
  );
}

export type EmptyStateIconProps = ComponentPropsWithoutRef<"div">;

export function EmptyStateIcon({ className, ...props }: EmptyStateIconProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("vs-ui-empty-state-icon flex size-10 items-center justify-center", className)}
      data-slot="empty-state-icon"
      {...props}
    />
  );
}

export type EmptyStateTitleProps = ComponentPropsWithoutRef<"h2">;

export function EmptyStateTitle({ className, ...props }: EmptyStateTitleProps) {
  return (
    <h2
      className={cn("vs-ui-empty-state-title", className)}
      data-slot="empty-state-title"
      {...props}
    />
  );
}

export type EmptyStateDescriptionProps = ComponentPropsWithoutRef<"p">;

export function EmptyStateDescription({ className, ...props }: EmptyStateDescriptionProps) {
  return (
    <p
      className={cn("vs-ui-empty-state-description max-w-prose", className)}
      data-slot="empty-state-description"
      {...props}
    />
  );
}

export type EmptyStateActionsProps = ComponentPropsWithoutRef<"div">;

export function EmptyStateActions({ className, ...props }: EmptyStateActionsProps) {
  return (
    <div
      className={cn("vs-ui-empty-state-actions flex flex-wrap items-center justify-center gap-2 pt-1", className)}
      data-slot="empty-state-actions"
      {...props}
    />
  );
}
