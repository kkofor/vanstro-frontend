import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

export type SeparatorOrientation = "horizontal" | "vertical";

export type SeparatorProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "aria-hidden" | "aria-orientation" | "role"
> & {
  decorative?: boolean;
  orientation?: SeparatorOrientation;
};

export function Separator({
  className,
  decorative = true,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  return (
    <div
      aria-hidden={decorative || undefined}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "vs-ui-separator shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px self-stretch",
        className
      )}
      data-orientation={orientation}
      data-slot="separator"
      role={decorative ? "none" : "separator"}
      {...props}
    />
  );
}
