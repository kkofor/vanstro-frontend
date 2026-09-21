"use client";

import { Accordion as AccordionPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

export function Accordion({ className, ...props }: ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" className={cn(className)} {...props} />;
}

export function AccordionItem({ className, ...props }: ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("home-faq-item", className)}
      {...props}
    />
  );
}

export function AccordionTrigger({ className, children, ...props }: ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="home-faq-header">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn("home-faq-trigger", className)}
        {...props}
      >
        <span className="home-faq-trigger-label">{children}</span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn("home-faq-content", className)}
      {...props}
    >
      <div className="home-faq-content-inner">{children}</div>
    </AccordionPrimitive.Content>
  );
}
