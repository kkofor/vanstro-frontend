"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";

export function PanelHeader({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="dashboard-panel-header">
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}

export function Table({
  columns,
  rows,
  caption = "Data table",
  emptyMessage = "No records found."
}: {
  columns: string[];
  rows: ReactNode[][];
  caption?: string;
  emptyMessage?: string;
}) {
  return (
    <div className="dashboard-table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table className="dashboard-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PaginationBar(props: {
  page: number;
  totalPages: number;
  total: number;
  pageLabel: string;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
}) {
  if (props.totalPages <= 1) {
    return props.total > 0 ? <p className="dashboard-pagination">{props.pageLabel}</p> : null;
  }

  return (
    <div className="dashboard-pagination">
      <span>{props.pageLabel}</span>
      <div className="dashboard-pagination-actions">
        <button
          aria-label={props.previousLabel ?? "Previous page"}
          className="button button-secondary"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(props.page - 1)}
          type="button"
        >
          ←
        </button>
        <span>
          {props.page} / {props.totalPages}
        </span>
        <button
          aria-label={props.nextLabel ?? "Next page"}
          className="button button-secondary"
          disabled={props.page >= props.totalPages}
          onClick={() => props.onPageChange(props.page + 1)}
          type="button"
        >
          →
        </button>
      </div>
    </div>
  );
}

export function QueueStatusFilter(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="dashboard-filter">
      <span>{props.label}</span>
      <select value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NotesList(props: { notes?: Array<{ note: string; createdAt: string }>; locale: string }) {
  if (!props.notes?.length) return <p className="dashboard-empty">—</p>;
  return (
    <ul className="dashboard-notes-list">
      {props.notes.map((entry, index) => (
        <li key={`${entry.createdAt}-${index}`}>
          <strong>{new Date(entry.createdAt).toLocaleString(props.locale)}</strong>
          <p>{entry.note}</p>
        </li>
      ))}
    </ul>
  );
}

export function DetailDrawer(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
  footer?: ReactNode;
  unsaved?: boolean;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(props.onClose);
  const titleId = useId();
  onCloseRef.current = props.onClose;
  const closeDrawer = useCallback(() => onCloseRef.current(), []);

  // V11-R1 P0 editable framework: warn before leaving the page while the
  // drawer holds unsaved edits (refresh/close navigation). Client-side nav
  // guards land with the P1 edit flows.
  useEffect(() => {
    if (!props.unsaved) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [props.unsaved]);

  useModalFocus({
    active: props.open,
    containerRef: drawerRef,
    modalRootRef: backdropRef,
    onEscape: closeDrawer
  });

  if (!props.open) return null;
  return (
    <div
      ref={backdropRef}
      className="dashboard-drawer-backdrop"
      onClick={props.onClose}
      role="presentation"
    >
      <aside
        ref={drawerRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className="dashboard-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        <header className="dashboard-drawer-header">
          <h3 id={titleId}>{props.title}</h3>
          <button
            aria-label={props.closeLabel ?? "Close details"}
            className="button button-secondary"
            onClick={props.onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="dashboard-drawer-body">{props.children}</div>
        {props.footer ? <footer className="dashboard-drawer-footer">{props.footer}</footer> : null}
      </aside>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="dashboard-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
