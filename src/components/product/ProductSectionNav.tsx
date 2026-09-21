"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "specifications", label: "Specifications" },
  { id: "documents", label: "Documents" },
  { id: "qa", label: "Q&A" },
  { id: "reviews", label: "Reviews" },
  { id: "complete-project", label: "Complete The Project" }
] as const;

const ROOT_MARGIN = "-140px 0px -60% 0px";

type ProductSectionNavProps = {
  /** Server-computed count of public specification rows; rendered only on the Specifications pill. */
  specificationsCount?: number;
  /** Server-computed Q&A entry count; rendered only on the Q&A pill. */
  qaCount?: number;
};

export function ProductSectionNav({ specificationsCount, qaCount }: ProductSectionNavProps) {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const activeRef = useRef<string>(SECTIONS[0].id);

  useEffect(() => {
    // Watch only the real section elements. Alias spans (#specs/#docs/#pairs)
    // are decoys that must never drive the active state.
    const targets = SECTIONS.map(({ id }) => document.getElementById(id)).filter(
      (element): element is HTMLElement => element !== null
    );

    if (targets.length === 0) {
      return;
    }

    const visible = new Set<string>();

    const resolve = () => {
      // Deepest visible section wins so a section still peeking under the
      // sticky nav does not keep overriding the section being read.
      for (let index = SECTIONS.length - 1; index >= 0; index -= 1) {
        const { id } = SECTIONS[index];
        if (visible.has(id)) {
          if (id !== activeRef.current) {
            activeRef.current = id;
            setActiveId(id);
          }
          return;
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        resolve();
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 }
    );

    for (const target of targets) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <nav className="anchors" aria-label="On this page">
      {SECTIONS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={activeId === id ? "is-active" : undefined}
          aria-current={activeId === id ? "true" : undefined}
        >
          {label}
          {id === "specifications" && specificationsCount !== undefined && (
            <small>{specificationsCount}</small>
          )}
          {id === "qa" && qaCount !== undefined && <small>{qaCount}</small>}
        </a>
      ))}
    </nav>
  );
}
