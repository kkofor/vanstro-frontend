# VanStro UI Library Foundation v1 — Integration-Frozen Contract

## Contract status

This document is the **Integration-frozen and accepted UI-0 contract**. UI-0 has completed Frontend formalization and Integration certification; the candidate lifecycle is closed. The active authority is:

1. `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-ui0-vanstro-ui-library-foundation-coordinator-prompt.md`
2. `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-ui0-omp-uncommitted-trial-addendum.md`
3. `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-ui0-l3-l4-continuous-goal.md`
4. `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/v1-ui0-l4-authority-closure-correction-goal.md`

Frontend implementation and formalization are complete (`e933defca7f101fc17813f729b0a9a6ef0254af9`), and Integration certification is complete (`c3b81aa0500817acf69db5ea539d5f3bfaef2023`, parents `135d1b1e52dabffa652b4fea7cf236988476dd4f` + `e933defca7f101fc17813f729b0a9a6ef0254af9`). The trial addendum's no-stage/no-commit lifecycle is superseded by the L3→L4 continuous-goal and closure-goal authorities. The base prompt continues to govern technical behavior and scope.

| Classification | Value |
|---|---:|
| `countsAsWorkPackage` | `false` |
| `addsDagNode` | `false` |
| `changesDependencies` | `false` |
| `addsContractGate` | `false` |
| `progressContribution` | `0` |
| migration | `none` |

UI-0 does not change the v1 capability, work-package, Settings, Wave, CG01, DAG-node, edge, or critical-dependency counts. Backend is read-only. Main and production remain unchanged.

## 1. Public entry and stable component API

The only new product UI import root is `@/components/ui/*`. Its physical root is `src/components/ui/`. The optional aggregate export is `src/components/ui/index.ts`; features must not observe Radix or CVA implementation types.

The candidate public surface is:

- `cn`
- `Button`, `buttonVariants`, `ButtonProps`, `ButtonVariant`, `ButtonSize`
  - variants: `primary | secondary | ghost | destructive | link`
  - sizes: `default | sm | lg | icon`
  - loading and disabled states suppress activation and remain perceivable; icon-only controls require an accessible name; the normal effective target is 44px.
- `Field`, `FieldLabel`, `FieldDescription`, `FieldError` and their matching prop types
  - label, help, error, required, `aria-describedby`, and `aria-invalid` wiring is stable.
- `Input`, `Textarea`, `Select`, and `Checkbox`, with matching prop types
  - Select and Checkbox wrap native elements. Radix Select and Checkbox are not authorized.
- `Badge`, `badgeVariants`, `BadgeProps`, `BadgeVariant`
  - variants: `neutral | success | warning | error | info | readiness`.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` and matching prop types.
- `Section`, `SectionHeader`, `SectionTitle`, `SectionDescription`, `SectionContent`, `SectionActions` and matching prop types.
  - Card and Section group real content; neither provides a decorative KPI template.
- `Separator`, `SeparatorProps`, `SeparatorOrientation`
  - orientations: `horizontal | vertical`.
- `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`, `TableEmpty` and matching prop types
  - caption, header, empty-state, labelled overflow-region, and native table semantics remain available.
- `Pagination`, `PaginationProps`
  - current page, total pages, region label, previous/next names, and boundary-disabled controls are explicit.
- `Skeleton`, `SkeletonProps`, with screen-reader loading text.
- `EmptyState`, `EmptyStateIcon`, `EmptyStateTitle`, `EmptyStateDescription`, `EmptyStateActions` and matching prop types, with screen-reader-visible outcome text.
- `StatusMessage`, `StatusMessageTitle`, `StatusMessageContent`, `StatusMessageActions` and matching prop types
  - variants: `neutral | info | success | warning | error`; roles: `status | alert`.
- `LiveRegion`, `LiveRegionProps`, `LiveRegionPoliteness`
  - politeness: `polite | assertive`; atomic behavior is explicit.
- `DialogRoot`, `DialogTrigger`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `ConfirmDialog` and matching prop types
  - the low-level parts are Radix-backed, but Radix types do not escape the UI directory. `ConfirmDialog` is the VanStro high-level confirmation API and supports controlled/uncontrolled open state, trigger, title/description, labels, destructive/loading/disabled state, overlay-dismiss policy, confirmation callback, `errorMessage` content or formatter, and `onConfirmError`. An asynchronous rejection keeps the Dialog open and renders the error with `role="alert"`; the primitive reports the unknown error but does not interpret business errors.

Pure variant declarations live in `*-variants.ts` so the current `node:test` and Node type-stripping setup can exercise them without executing TSX.

## 2. `data-slot`

Every public component and every public Dialog part renders a stable `data-slot` on its semantic outer element, with exactly two non-rendering exceptions: `DialogPortal` (the Radix portal does not render a semantic outer element) and `DialogRoot` (a Radix context provider that renders no element). `DialogOverlay` and `DialogContent` remain required to render `data-slot="dialog-overlay"` and `data-slot="dialog-content"`; the exemptions must not be implemented by adding a DOM wrapper. Slot names use lowercase kebab-case, identify component parts rather than business state, and do not replace semantic HTML or ARIA. A public compound component gives each rendered exported part its own stable slot.

## 3. Exact token mapping

Existing `:root` variables in `src/app/globals.css` remain the sole visual color, radius, and shadow token source. The candidate aliases are exact:

| UI alias | Existing source |
|---|---|
| `--ui-background` | `var(--color-surface)` |
| `--ui-foreground` | `var(--color-text)` |
| `--ui-surface` | `var(--color-surface)` |
| `--ui-surface-muted` | `var(--color-soft)` |
| `--ui-border` | `var(--color-line)` |
| `--ui-primary` | `var(--color-ink)` |
| `--ui-primary-hover` | `var(--color-ink-2)` |
| `--ui-primary-foreground` | `var(--color-surface)` |
| `--ui-accent` | `var(--color-accent)` |
| `--ui-accent-hover` | `var(--color-accent-dark)` |
| `--ui-accent-foreground` | `var(--color-text)` |
| `--ui-muted-foreground` | `var(--color-text-muted)` |
| `--ui-success` | `var(--color-success)` |
| `--ui-warning` | `var(--color-accent-text)` |
| `--ui-error` | `var(--color-error)` |
| `--ui-error-surface` | `var(--color-error-soft)` |
| `--ui-focus` | `var(--color-focus)` |
| `--ui-radius-sm` | `var(--radius-sm)` |
| `--ui-radius-md` | `var(--radius-md)` |
| `--ui-radius-lg` | `var(--radius-lg)` |
| `--ui-shadow-panel` | `var(--shadow-panel)` |
| `--ui-shadow-floating` | `var(--shadow-floating)` |
| `--ui-font-sans` | `"Segoe UI Variable Text", "Segoe UI Variable Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif` |

The literal typography stack is the sole alias exception because it exactly matches the established body stack; it does not introduce a brand font. `@theme inline` exposes aliases to Tailwind. Aliases must not self-reference or copy raw brand color literals.

## 4. Tailwind v4, no-preflight coexistence, and CSS ownership

Tailwind v4 theme and utilities are enabled without preflight/base reset. Existing CSS stays unlayered, unmoved, unformatted, and unchanged except for the approved top-level Tailwind and token wiring. Existing element and class behavior remains authoritative outside the UI namespace.

`src/components/ui/ui-compat.css` is the only compatibility stylesheet. It uses single `.vs-ui-*` class selectors only: no element, feature, legacy, compound, ID, or `!important` selector. It cannot affect existing elements or classes.

Property ownership is exclusive:

- Tailwind utilities own layout, spacing, size, overflow, and positioning.
- `ui-compat.css` owns font, text color, variant color, and hover/focus/disabled/destructive state colors.
- Button and Badge variant visuals have one authority: the CVA-emitted `.vs-ui-button-<variant>` and `.vs-ui-badge-<variant>` classes. Their `[data-variant]` attributes remain public state metadata, not visual selectors.
- Input, Textarea, Select, and Checkbox invalid visuals have one authority: `[aria-invalid="true"]`. Their `[data-invalid]` attributes remain public state metadata, not visual selectors.

This split prevents unlayered legacy element rules from silently overriding layered utility colors while avoiding a second styling convention.

## 5. Dependency allowlist and direct-import denylist

The initial runtime allowlist is exactly:

- `@radix-ui/react-dialog`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`

The initial development allowlist is exactly:

- `tailwindcss` v4
- `@tailwindcss/postcss` v4
- `postcss`

Only `src/components/ui/**` may directly import the four runtime dependencies. Any direct import elsewhere under `src/**` is a blocker. UI-0 does not authorize another Radix package, Bun, Turborepo, Vitest, Jest, Storybook, Chromatic, next-themes, sonner, cmdk, React Hook Form, Zod, or Recharts. Popover, Tooltip, Dropdown, Command, Select, and other headless additions require a real consumer and a new contract authorization.

## 6. SSR, static export, RSC, and client boundaries

Components emit deterministic server markup and do not access browser globals during render. The library and the owned QA fixture remain compatible with the current Next.js static-export chain.

Modules are server-compatible by default. Add `"use client"` only to the smallest module that requires state, effects, event handlers, refs, or a client-only third-party primitive. Dialog is a client boundary. Pure `cn` and variant modules remain directive-free. Portal and controlled/uncontrolled Dialog states must hydrate without mismatch.

## 7. Accessibility contract

All primitives preserve native semantics, visible or programmatic labels, keyboard operation, visible focus, perceivable disabled/loading states, and associated field errors.

The Dialog browser contract covers open/close, trigger and return focus, Escape, Tab containment, nested Dialog containment, portal/hydration, scroll lock, a defined overlay-click policy, labelled title/description, a Chinese visible or screen-reader-only close label, forced-colors, reduced-motion, and server/static-export hydration.

`StatusMessage` selects `status` or `alert` intentionally. `LiveRegion` supports polite/assertive and atomic behavior. Skeleton and EmptyState include screen-reader text. Static source inspection cannot substitute for the required Dialog behavior fixture.

## 8. Visual freeze

New primitives use current VanStro tokens and Chinese desktop density. UI-0 grants no redesign authority. Existing screenshots, DOM, accessibility behavior, and static artifacts must remain equivalent to the accepted S02 baseline. Any unexplained visible difference blocks formalization.

## 9. Rollback and deprecation

Zero adoption makes rollback bounded: after explicit authorization, remove the candidate UI/config/QA additions and revert only the approved `package.json`, `pnpm-lock.yaml`, and `src/app/globals.css` candidate deltas.

After formalization, public names, prop semantics, variants, `data-slot` values, and token aliases are compatibility surface. Do not silently remove or rename them. Publish a replacement and migration window, migrate every consumer, and remove the old surface only under a separately authorized contract.

## 10. Zero page adoption

UI-0 changes no existing page or component, adds no product route, and adopts no primitive in an existing consumer. This includes `GeneralStorefrontSettingsPanel`, `SettingsFoundationPanel`, F0 Shell, legacy Dashboard panels, Storefront, Header, Footer, PDP, Cart, Checkout, Account, and existing Drawer/Dialog consumers.

The browser fixture lives under `qa/v1-ui0-browser/`. It must not live under `src/app`, enter the static product route set, or alter product artifacts.

## 11. Future `packages/ui` extraction condition

UI-0 does not create `packages/ui`. Extraction is a v4-only possibility under separate authorization and only when all conditions hold:

1. More than one application has real consumers of the same stable primitives.
2. The public API and token contract have remained stable through measured adoption.
3. The package remains free of application Auth, Observability, API, P02, and business-state coupling.
4. RSC/client boundaries and CSS delivery work across every consuming application.
5. A migration plan preserves import and visual contracts.
6. Independent contract, build, static-export, browser, accessibility, rollback, and deprecation gates are approved.

## 12. Legacy UI entry exceptions

Two pre-existing uppercase components are formal `legacy-ui-entry` exceptions:

- `src/components/ui/CommerceStatePanel.tsx`, retaining `@/components/ui/CommerceStatePanel`
- `src/components/ui/HorizontalScrollRail.tsx`, retaining `@/components/ui/HorizontalScrollRail`

They are read-only in UI-0, are not exported from the new barrel, and retain their existing import paths. Direct-import and lowercase-filename guards exempt only these two entries. Their migration is deferred to v4.

## Formalization and certification record

- Frontend formalization commit: `e933defca7f101fc17813f729b0a9a6ef0254af9` (tree `8f3e911e5c97a6461d9091af3d73a2cd26be8c58`)
- Integration certification merge: `c3b81aa0500817acf69db5ea539d5f3bfaef2023` (tree `c25a877a1e0b13b7954cfd72133c25a653fb7046`, parents `135d1b1e52dabffa652b4fea7cf236988476dd4f` + `e933defca7f101fc17813f729b0a9a6ef0254af9`)
- Independent gate: `0 Blocker / 0 High`; non-blocking items registered in the v2 register (items 25–29).
- Migrations: 75, no 76; existing page visual/design frozen; Main and production not advanced.

This contract is frozen and accepted on the Integration line. Technical dimensions, public API, tokens, visual freeze, zero-adoption, rollback and v4 boundaries above remain authoritative and unchanged.
