"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

const modalStack: symbol[] = [];
const inertElements = new Map<HTMLElement, { count: number; wasInert: boolean }>();

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      !element.closest("[inert]") &&
      element.getClientRects().length > 0
  );
}

function makeBackgroundInert(modalRoot: HTMLElement) {
  const acquired = new Set<HTMLElement>();
  let current: HTMLElement = modalRoot;

  while (current.parentElement) {
    const parent = current.parentElement;

    for (const sibling of Array.from(parent.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === current || acquired.has(sibling)) continue;

      const existing = inertElements.get(sibling);
      if (existing) {
        existing.count += 1;
      } else {
        inertElements.set(sibling, { count: 1, wasInert: sibling.inert });
        sibling.inert = true;
      }
      acquired.add(sibling);
    }

    if (parent === document.body) break;
    current = parent;
  }

  return () => {
    for (const element of acquired) {
      const entry = inertElements.get(element);
      if (!entry) continue;

      entry.count -= 1;
      if (entry.count === 0) {
        element.inert = entry.wasInert;
        inertElements.delete(element);
      }
    }
  };
}

type UseModalFocusOptions = {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  modalRootRef?: RefObject<HTMLElement | null>;
  onEscape: () => void;
};

export function useModalFocus({
  active,
  containerRef,
  modalRootRef,
  onEscape
}: UseModalFocusOptions) {
  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    const modalRoot = modalRootRef?.current ?? container;
    if (!container || !modalRoot) return;

    const token = Symbol("modal-focus");
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseInert = makeBackgroundInert(modalRoot);
    modalStack.push(token);

    const focusFrame = window.requestAnimationFrame(() => {
      (getFocusableElements(container)[0] ?? container).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== token) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!container.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (activeElement === first || activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown, true);
      const stackIndex = modalStack.lastIndexOf(token);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
      releaseInert();

      if (modalStack.length === 0 && returnFocus?.isConnected) {
        window.requestAnimationFrame(() => returnFocus.focus());
      }
    };
  }, [active, containerRef, modalRootRef, onEscape]);
}
