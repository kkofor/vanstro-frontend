# GOALS: Backend Audit and Readiness Loop

## Status

| Goal | State | Evidence / gate |
| --- | --- | --- |
| G1 | done | `docs/reports/goal-loop-g1-baseline.md` |
| G2-G4 | done / system FAIL | `docs/reports/goal-loop-g2-g7-audit-summary.md` |
| G5 | done / system FAIL | `docs/reports/goal-loop-g5-database-consistency-review.md` |
| G6-G7 | done / system FAIL | `docs/reports/goal-loop-g2-g7-audit-summary.md` |
| G8 | done / deployment NO-GO | `docs/reports/goal-loop-g8-deployment-review.md` |
| G9 | done / NO-GO | `docs/reports/goal-loop-g9-release-recommendation.md` |
| G10 | Package A implemented / runtime gate pending | `docs/reports/goal-loop-g10-package-a-verification.md` |
| G11 | analysis done / implementation approval required | `docs/reports/goal-loop-g11-performance-analysis.md` |
| G12 | done | `docs/reports/goal-loop-g12-functional-improvements.md` |
| G13 | revised brief ready / awaiting approval | `docs/reports/goal-loop-g13-dashboard-design-brief.md` and capability matrix |
| G14 | pending | Requires approved G10, G11, and G13 work |
| G15 | pending | Requires G3, G4, G10, and approved G13 work |

## G1. Scope and Baseline Inventory

State: done.

Goal: establish the repository, runtime, deployment, and configuration baseline.

Acceptance evidence: file inventory, Git status, service topology, and environment-variable key inventory with no secret values.

## G2. Architecture and Data-Boundary Review

State: done; audited system failed the gate.

Goal: validate the Storefront -> API -> Postgres -> Dashboard/Worker boundary and Dashboard-owned catalog/pricing with ERP as inventory, fulfillment, and callback consumer.

Acceptance evidence: route, Prisma schema, Worker, and ERP-contract mapping.

## G3. API and Business-Flow Review

State: done; audited system failed the gate.

Goal: review authentication, users, catalog, pricing, cart, checkout, orders, submissions, reviews, privacy, Dashboard, and ERP webhook APIs.

Acceptance evidence: endpoint matrix, code evidence, smoke-test coverage map, and test-gap list.

## G4. Identity, Authorization, and Audit Review

State: done; audited system failed the gate.

Goal: review sessions, Admin RBAC, service accounts, CLI/MCP, privilege escalation paths, and audit-log completeness.

Acceptance evidence: permission matrix, negative-path verification, and audit-trail evidence.

## G5. Database, Migration, and Consistency Review

State: done; audited system failed the gate.

Goal: review schema, indexes, constraints, migration order, transactions, idempotency, queue claiming, retries, and duplicate execution risk.

Acceptance evidence: schema and migration review, plus documented concurrency-path findings.

## G6. Worker, Outbox, ERP, and Email Review

State: done; audited system failed the gate.

Goal: review failure isolation, retries, locks, alerts, suppression behavior, ERP degradation, and external-call boundaries.

Acceptance evidence: Worker state-machine review, failure-scenario evidence, and alert-path mapping.

## G7. Configuration, Dependencies, and Container Review

State: done; audited system failed the gate.

Goal: review secret handling, configuration, dependency vulnerabilities, Docker networking, port exposure, and local production parity.

Acceptance evidence: dependency scan, Compose review, and configuration-key comparison.

## G8. CI/CD and Deployment-Readiness Review

State: done; deployment readiness is NO-GO.

Goal: review CI workflows, static frontend release, missing API/Worker/DB deployment definitions, health checks, rollback, backup, and monitoring gaps.

Acceptance evidence: workflow review, deployment topology, deployment prerequisites, and blocking-item list.

## G9. Audit Consolidation and Release Recommendation

State: done; release recommendation is NO-GO.

Goal: consolidate review evidence into a prioritized report and a Go, Conditional Go, or No-Go recommendation.

Acceptance evidence: traceable findings, risk register, and release recommendation.

## G10. Code Iteration and Modularization

State: Package A approved and implemented on 2026-07-14. Static verification passed; controlled local seed and database-backed API smoke remain approval-gated. Migration execution, Docker changes, Git operations, external-service calls, and deployment remain outside the approval boundary.

Goal: implement approved, minimal fixes that remove confirmed defects, duplicated logic, oversized modules, and unclear ownership boundaries.

Acceptance evidence: each change maps to a finding; type checks, API smoke, Worker validation, frontend build, and regression checks pass.

Dependency: approval required before code changes.

## G11. Performance Analysis and Optimization

State: read-only analysis done; optimization implementation remains approval-gated.

Goal: identify and, after approval, optimize performance risks in API queries, Dashboard lists, cart/checkout, Worker polling, Outbox, and ERP synchronization.

Acceptance evidence: baseline and post-change results, query/code evidence, and regression verification.

Dependency: G3, G5, and G6; approval required before performance changes.

## G12. Product and Functional Improvement Proposal

State: done.

Goal: propose prioritized product, workflow, operational, and usability improvements without breaking established system boundaries.

Acceptance evidence: P0/P1/P2 proposal with user, problem, solution, expected benefit, dependencies, implementation scope, acceptance criteria, and risk for each item.

Dependency: G2, G3, and G6.

## G13. Dashboard UI Design and Functional-Area Modularization

State: final design brief completed and independently audited on 2026-07-14. Permission, route, capability, state, responsive, accessibility, and staged-acceptance gaps were corrected; explicit approval is still required and no UI code changes have started.

Goal: define and, after approval, implement a coherent Dashboard information architecture, visual system, responsive UI, and business-domain module boundaries.

Acceptance evidence: information architecture, permission-aware module map, design artifacts or implemented pages, desktop/mobile review, and build verification.

Dependency: G3, G4, and G12; approval required before UI/code changes.

## G14. End-to-End Regression Verification

Goal: after approved remediation and iteration, verify all core business, permission, failure-recovery, Dashboard, frontend, backend, and deployment-configuration flows.

Acceptance evidence: end-to-end test matrix, automated checks, negative-path results, open-risk list, and deployment recommendation.

Dependency: G10, G11, and any approved G13 work.

## G15. Frontend-Backend Integration and Backend-Control Revalidation

Goal: verify that dynamic storefront behavior uses the Website API and that Dashboard actions correctly control storefront-visible data and state.

Acceptance evidence: frontend/API/data/Dashboard mapping, Dashboard-to-storefront change evidence, mock/hard-coded-state inventory, and browser/API regression results.

Dependency: G3, G4, G10, and any approved G13 work.
