"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HorizontalScrollRailProps = {
  children: ReactNode;
  className: string;
  label: string;
  hint: string;
  previousLabel?: string;
  nextLabel?: string;
  activeKey?: string | number;
  activeSelector?: string;
};

export function HorizontalScrollRail({
  children,
  className,
  label,
  hint,
  previousLabel = `Previous ${label.toLowerCase()}`,
  nextLabel = `Next ${label.toLowerCase()}`,
  activeKey,
  activeSelector = '[aria-pressed="true"], [aria-current="page"]'
}: HorizontalScrollRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    function updateScrollState() {
      if (!rail) return;
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setCanScrollLeft(rail.scrollLeft > 2);
      setCanScrollRight(maxScrollLeft - rail.scrollLeft > 2);
    }

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [children]);

  useEffect(() => {
    const rail = railRef.current;
    const activeItem = rail?.querySelector<HTMLElement>(activeSelector);
    if (!rail || !activeItem) return;

    const railRect = rail.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    if (itemRect.left >= railRect.left && itemRect.right <= railRect.right) return;

    activeItem.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
      inline: "center"
    });
  }, [activeKey, activeSelector]);

  function scroll(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.72, 160),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }

  return (
    <div
      className="horizontal-rail-shell"
      data-can-scroll-left={canScrollLeft || undefined}
      data-can-scroll-right={canScrollRight || undefined}
    >
      <div className="horizontal-rail-toolbar" hidden={!canScrollLeft && !canScrollRight}>
        <small id={hintId}>{hint}</small>
        <span>
          <button
            type="button"
            aria-label={previousLabel}
            disabled={!canScrollLeft}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label={nextLabel}
            disabled={!canScrollRight}
            onClick={() => scroll(1)}
          >
            <ChevronRight aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </span>
      </div>
      <div
        ref={railRef}
        className={className}
        aria-label={label}
        aria-describedby={hintId}
      >
        {children}
      </div>
    </div>
  );
}
