"use client";

import { useEffect } from "react";

export type GuidesTocItem = {
  id: string;
  heading: string;
};

type GuidesTocProps = {
  items: GuidesTocItem[];
  label: string;
  mobileLabel: string;
};

// Highlight logic copied from the design disk's guides.js IntersectionObserver
// section only (no drawer-menu JS, no libraries). Scoped to .guides-article .toc
// and the toc-mobile links via the ".guides-article .toc a[href^='#']" query root.
export function GuidesToc({ items, label, mobileLabel }: GuidesTocProps) {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(".guides-article .toc a[href^='#']")
    );
    if (!links.length) return;

    const sections = links
      .map((link) => document.getElementById(decodeURIComponent(link.getAttribute("href")!.slice(1))))
      .filter((section): section is HTMLElement => Boolean(section));

    function setOn(id: string) {
      links.forEach((link) => {
        link.classList.toggle("is-on", link.getAttribute("href") === `#${id}`);
      });
    }

    if (!("IntersectionObserver" in window) || !sections.length) return;

    const visible: string[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = visible.indexOf(entry.target.id);
          if (entry.isIntersecting && index === -1) visible.push(entry.target.id);
          if (!entry.isIntersecting && index !== -1) visible.splice(index, 1);
        });
        if (visible[0]) setOn(visible[0]);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0.01 }
    );
    sections.forEach((section) => io.observe(section));
    return () => io.disconnect();
  }, [items]);

  return (
    <>
      <aside className="toc" aria-label={label}>
        <h2>{label}</h2>
        {items.map((item) => (
          <a key={item.id} href={`#${item.id}`}>
            {item.heading}
          </a>
        ))}
      </aside>
      <details className="toc-mobile">
        <summary>{mobileLabel}</summary>
        {items.map((item) => (
          <a key={`m-${item.id}`} href={`#${item.id}`}>
            {item.heading}
          </a>
        ))}
      </details>
    </>
  );
}
