import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

export type LiveRegionPoliteness = "polite" | "assertive";

export type LiveRegionProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "aria-atomic" | "aria-live" | "role"
> & {
  atomic?: boolean;
  politeness?: LiveRegionPoliteness;
  visuallyHidden?: boolean;
};

export function LiveRegion({
  atomic = true,
  className,
  politeness = "polite",
  visuallyHidden = true,
  ...props
}: LiveRegionProps) {
  return (
    <div
      aria-atomic={atomic}
      aria-live={politeness}
      className={cn("vs-ui-live-region", visuallyHidden && "sr-only", className)}
      data-slot="live-region"
      data-visibility={visuallyHidden ? "screen-reader" : "visible"}
      role={politeness === "assertive" ? "alert" : "status"}
      {...props}
    />
  );
}
