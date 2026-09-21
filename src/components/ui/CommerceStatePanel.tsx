import type { ReactNode } from "react";

export function CommerceStatePanel({
  title,
  body,
  tone = "neutral",
  live = false,
  actions,
  compact = false
}: {
  title: string;
  body?: string;
  tone?: "neutral" | "error" | "success";
  live?: boolean;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`commerce-state commerce-state-${tone}${compact ? " commerce-state-compact" : ""}`}
      role={tone === "error" ? "alert" : live ? "status" : undefined}
      aria-live={tone === "error" ? "assertive" : live ? "polite" : undefined}
    >
      <span className="commerce-state-mark" aria-hidden="true" />
      <div className="commerce-state-copy">
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
      </div>
      {actions ? <div className="commerce-state-actions">{actions}</div> : null}
    </section>
  );
}

export function CommercePageSkeleton({
  rows = 3,
  label
}: {
  rows?: number;
  label: string;
}) {
  return (
    <div className="commerce-skeleton-layout" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="commerce-skeleton-list" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div className="commerce-skeleton-row" key={index}>
            <span className="commerce-skeleton-image" />
            <span className="commerce-skeleton-copy">
              <i />
              <i />
              <i />
            </span>
          </div>
        ))}
      </div>
      <div className="commerce-skeleton-summary" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
