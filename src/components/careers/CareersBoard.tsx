"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import {
  CAREERS_EMAIL,
  buildCareerMailto,
  type CareersContent
} from "@/content/careers";

type CareersBoardProps = {
  content: CareersContent;
};

function roleFromHash(content: CareersContent) {
  const slug = window.location.hash.slice(1);
  return content.roles.some((role) => role.slug === slug)
    ? slug
    : content.roles[0]?.slug ?? "";
}

export function CareersBoard({ content }: CareersBoardProps) {
  const [selectedSlug, setSelectedSlug] = useState(content.roles[0]?.slug ?? "");
  const [enhanced, setEnhanced] = useState(false);
  const selectionSource = useRef<"initial" | "navigation" | "history">("initial");

  useEffect(() => {
    const syncFromHash = () => {
      selectionSource.current = "history";
      setSelectedSlug(roleFromHash(content));
    };

    setSelectedSlug(roleFromHash(content));
    setEnhanced(true);
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [content]);

  useEffect(() => {
    if (!enhanced || selectionSource.current === "initial") return;

    const heading = document.getElementById(`${selectedSlug}-title`);
    if (!(heading instanceof HTMLElement)) return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.focus({ preventScroll: true });
    if (isMobile) {
      heading.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
    }
    selectionSource.current = "initial";
  }, [enhanced, selectedSlug]);

  function selectRole(event: React.MouseEvent<HTMLAnchorElement>, slug: string) {
    event.preventDefault();
    selectionSource.current = "navigation";
    window.history.pushState(null, "", `#${slug}`);

    if (slug === selectedSlug) {
      const heading = document.getElementById(`${slug}-title`);
      if (heading instanceof HTMLElement) heading.focus({ preventScroll: true });
      selectionSource.current = "initial";
      return;
    }

    setSelectedSlug(slug);
  }

  return (
    <section className="careers-board" id="open-roles" aria-labelledby="open-roles-title">
      <div className="container careers-board-layout" data-enhanced={enhanced ? "true" : undefined}>
        <nav className="careers-board-nav" aria-labelledby="open-roles-title">
          <div className="careers-board-nav-heading">
            <h2 id="open-roles-title">{content.rolesTitle}</h2>
            <span>{content.roles.length} {content.positionsLabel}</span>
          </div>
          <ol className="careers-board-list">
            {content.roles.map((role) => {
              const isCurrent = role.slug === selectedSlug;
              return (
                <li key={role.slug}>
                  <a
                    className={isCurrent ? "is-active" : undefined}
                    href={`#${role.slug}`}
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={(event) => selectRole(event, role.slug)}
                  >
                    <span className="careers-board-role-title">{role.title}</span>
                    <span className="careers-board-role-meta">
                      <MapPin size={15} aria-hidden="true" />
                      {role.location}
                    </span>
                    <ArrowRight className="careers-board-arrow" size={19} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="careers-board-details">
          {content.roles.map((role) => {
            const isSelected = role.slug === selectedSlug;
            return (
              <article
                className={isSelected ? "careers-detail is-selected" : "careers-detail"}
                id={role.slug}
                key={role.slug}
                aria-labelledby={`${role.slug}-title`}
                aria-hidden={enhanced && !isSelected ? "true" : undefined}
              >
                <header className="careers-detail-header">
                  <h2 id={`${role.slug}-title`} tabIndex={-1}>{role.title}</h2>
                  <p className="careers-detail-meta">
                    {[role.location, role.workArrangement, role.employmentType].filter(Boolean).join(" · ")}
                  </p>
                </header>

                <section className="careers-detail-section" aria-labelledby={`${role.slug}-summary`}>
                  <h3 id={`${role.slug}-summary`}>{content.summaryTitle}</h3>
                  <p>{role.summary}</p>
                </section>

                <div className="careers-detail-columns">
                  <section className="careers-detail-section" aria-labelledby={`${role.slug}-required`}>
                    <h3 id={`${role.slug}-required`}>{content.requirementsTitle}</h3>
                    <ul>{role.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                  </section>
                  <section className="careers-detail-section" aria-labelledby={`${role.slug}-responsibilities`}>
                    <h3 id={`${role.slug}-responsibilities`}>{content.responsibilitiesTitle}</h3>
                    <ul>{role.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
                  </section>
                  {role.preferred?.length ? (
                    <section className="careers-detail-section" aria-labelledby={`${role.slug}-preferred`}>
                      <h3 id={`${role.slug}-preferred`}>{content.preferredTitle}</h3>
                      <ul>{role.preferred.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ) : null}
                </div>

                <aside className="careers-detail-apply" aria-label={`${content.applyTitle}: ${role.title}`}>
                  <div>
                    <h3>{content.applyTitle}</h3>
                    <p>{content.applyDescription} <a href={`mailto:${CAREERS_EMAIL}`}>{CAREERS_EMAIL}</a>.</p>
                  </div>
                  <a className="button button-primary" href={buildCareerMailto(role.subject)}>
                    {content.applyButton}
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>
                </aside>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
