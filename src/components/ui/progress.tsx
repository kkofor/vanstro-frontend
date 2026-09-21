"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { forwardRef } from "react";
import { cn } from "./cn";

export type ProgressProps = React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
>;

export const Progress = forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(function Progress({ className, value, ...props }, ref) {
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("vs-ui-progress relative h-2 w-full overflow-hidden rounded-full", className)}
      data-slot="progress"
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="vs-ui-progress-indicator h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
