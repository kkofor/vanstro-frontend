import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

export type StatusMessageVariant = "neutral" | "info" | "success" | "warning" | "error";
export type StatusMessageRole = "status" | "alert";

export type StatusMessageProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "aria-atomic" | "aria-live" | "role"
> & {
  atomic?: boolean;
  role?: StatusMessageRole;
  variant?: StatusMessageVariant;
};

export function StatusMessage({
  atomic = true,
  className,
  role,
  variant = "neutral",
  ...props
}: StatusMessageProps) {
  const resolvedRole = role ?? (variant === "error" ? "alert" : "status");

  return (
    <div
      aria-atomic={atomic}
      aria-live={resolvedRole === "alert" ? "assertive" : "polite"}
      className={cn("vs-ui-status-message flex items-start gap-3 p-3", className)}
      data-slot="status-message"
      data-variant={variant}
      role={resolvedRole}
      {...props}
    />
  );
}

export type StatusMessageTitleProps = ComponentPropsWithoutRef<"p">;

export function StatusMessageTitle({ className, ...props }: StatusMessageTitleProps) {
  return (
    <p
      className={cn("vs-ui-status-message-title", className)}
      data-slot="status-message-title"
      {...props}
    />
  );
}

export type StatusMessageContentProps = ComponentPropsWithoutRef<"div">;

export function StatusMessageContent({ className, ...props }: StatusMessageContentProps) {
  return (
    <div
      className={cn("vs-ui-status-message-content min-w-0 flex-1", className)}
      data-slot="status-message-content"
      {...props}
    />
  );
}

export type StatusMessageActionsProps = ComponentPropsWithoutRef<"div">;

export function StatusMessageActions({ className, ...props }: StatusMessageActionsProps) {
  return (
    <div
      className={cn("vs-ui-status-message-actions flex shrink-0 items-center gap-2", className)}
      data-slot="status-message-actions"
      {...props}
    />
  );
}
