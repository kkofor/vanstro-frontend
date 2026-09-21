import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

export type SkeletonProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "aria-busy" | "aria-live" | "children" | "role"
> & {
  label: string;
};

export function Skeleton({ className, label, ...props }: SkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn("vs-ui-skeleton relative min-h-4 w-full overflow-hidden", className)}
      data-slot="skeleton"
      role="status"
      {...props}
    >
      <span className="sr-only" data-slot="skeleton-label">
        {label}
      </span>
    </div>
  );
}
