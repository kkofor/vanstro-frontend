import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

export type CardProps = ComponentPropsWithoutRef<"article">;

export function Card({ className, ...props }: CardProps) {
  return (
    <article
      className={cn("vs-ui-card flex flex-col", className)}
      data-slot="card"
      {...props}
    />
  );
}

export type CardHeaderProps = ComponentPropsWithoutRef<"header">;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <header
      className={cn("vs-ui-card-header flex flex-col gap-1.5 p-5", className)}
      data-slot="card-header"
      {...props}
    />
  );
}

export type CardTitleProps = ComponentPropsWithoutRef<"h3">;

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn("vs-ui-card-title", className)}
      data-slot="card-title"
      {...props}
    />
  );
}

export type CardDescriptionProps = ComponentPropsWithoutRef<"p">;

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn("vs-ui-card-description", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

export type CardContentProps = ComponentPropsWithoutRef<"div">;

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div
      className={cn("vs-ui-card-content px-5 pb-5", className)}
      data-slot="card-content"
      {...props}
    />
  );
}

export type CardFooterProps = ComponentPropsWithoutRef<"footer">;

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <footer
      className={cn("vs-ui-card-footer flex items-center gap-3 px-5 pb-5", className)}
      data-slot="card-footer"
      {...props}
    />
  );
}
