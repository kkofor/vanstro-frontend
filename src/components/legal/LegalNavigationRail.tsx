"use client";

import Link from "next/link";
import type { LegalPageLink } from "@/content/legalPages";
import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";

type LegalNavigationRailProps = {
  activeSlug: string;
  links: LegalPageLink[];
  label?: string;
  hint?: string;
  previousLabel?: string;
  nextLabel?: string;
};

export function LegalNavigationRail({
  activeSlug,
  links,
  label = "Legal pages",
  hint = "Swipe or use the arrow buttons to view more legal pages.",
  previousLabel = "Previous legal pages",
  nextLabel = "Next legal pages"
}: LegalNavigationRailProps) {
  return (
    <HorizontalScrollRail
      className="legal-link-row"
      label={label}
      hint={hint}
      previousLabel={previousLabel}
      nextLabel={nextLabel}
      activeKey={activeSlug}
    >
      {links.map((link) => {
        const isActive = link.href === `/${activeSlug}` || link.href === `/fr/${activeSlug}`;

        return (
          <Link
            className={`legal-link-chip${isActive ? " is-active" : ""}`}
            href={link.href}
            key={link.href}
            aria-label={link.label}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="legal-link-chip-desktop" aria-hidden="true">
              {link.label}
            </span>
            <span className="legal-link-chip-mobile" aria-hidden="true">
              {link.shortLabel ?? link.label}
            </span>
          </Link>
        );
      })}
    </HorizontalScrollRail>
  );
}
