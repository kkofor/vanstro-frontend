"use client";

import type { ReactNode } from "react";

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

export function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>—</td>
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
}) {
  if (props.totalPages <= 1) {
    return props.total > 0 ? <p className="dashboard-pagination">{props.pageLabel}</p> : null;
  }

  return (
    <div className="dashboard-pagination">
      <span>{props.pageLabel}</span>
      <div className="dashboard-pagination-actions">
        <button
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
}) {
  if (!props.open) return null;
  return (
    <div className="dashboard-drawer-backdrop" onClick={props.onClose} role="presentation">
      <aside
        className="dashboard-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={props.title}
      >
        <header className="dashboard-drawer-header">
          <h3>{props.title}</h3>
          <button className="button button-secondary" onClick={props.onClose} type="button">
            ×
          </button>
        </header>
        <div className="dashboard-drawer-body">{props.children}</div>
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
