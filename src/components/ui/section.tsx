import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

export type SectionProps = ComponentPropsWithoutRef<"section">;

export function Section({ className, ...props }: SectionProps) {
  return (
    <section
      className={cn("vs-ui-section flex flex-col gap-4", className)}
      data-slot="section"
      {...props}
    />
  );
}

export type SectionHeaderProps = ComponentPropsWithoutRef<"header">;

export function SectionHeader({ className, ...props }: SectionHeaderProps) {
  return (
    <header
      className={cn("vs-ui-section-header flex items-start justify-between gap-4", className)}
      data-slot="section-header"
      {...props}
    />
  );
}

export type SectionTitleProps = ComponentPropsWithoutRef<"h2">;

export function SectionTitle({ className, ...props }: SectionTitleProps) {
  return (
    <h2
      className={cn("vs-ui-section-title", className)}
      data-slot="section-title"
      {...props}
    />
  );
}

export type SectionDescriptionProps = ComponentPropsWithoutRef<"p">;

export function SectionDescription({ className, ...props }: SectionDescriptionProps) {
  return (
    <p
      className={cn("vs-ui-section-description", className)}
      data-slot="section-description"
      {...props}
    />
  );
}

export type SectionContentProps = ComponentPropsWithoutRef<"div">;

export function SectionContent({ className, ...props }: SectionContentProps) {
  return (
    <div
      className={cn("vs-ui-section-content", className)}
      data-slot="section-content"
      {...props}
    />
  );
}

export type SectionActionsProps = ComponentPropsWithoutRef<"div">;

export function SectionActions({ className, ...props }: SectionActionsProps) {
  return (
    <div
      className={cn("vs-ui-section-actions flex shrink-0 items-center gap-2", className)}
      data-slot="section-actions"
      {...props}
    />
  );
}
