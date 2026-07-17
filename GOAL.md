# GOAL: Backend Audit, Iteration, and Deployment Readiness

## Final Objective

Perform a complete, evidence-based audit of the VanStro backend project and complete approved code iteration, modularization, performance optimization, product improvements, Dashboard UI design, and end-to-end verification required for deployment readiness.

## Completion Criteria

- All backend entry points, write paths, asynchronous jobs, and deployment configuration are reviewed.
- Every finding includes severity, impact, code evidence, a remediation recommendation, and deployment impact.
- Approved findings are remediated and verified without regressions.
- Core-path performance analysis and approved optimizations have before-and-after evidence.
- Dashboard UI and functional areas are modular, usable, responsive, and aligned with RBAC.
- Frontend dynamic behavior is backed by the Website API rather than unmarked mock or hard-coded business state.
- Core workflows, permission boundaries, failure recovery, and Dashboard functional areas pass end-to-end regression verification.
- Final audit, remediation, performance, product-improvement, and deployment-readiness reports are complete.

## Automatic Actions

- Read source code, documentation, Git history, configuration templates, and local runtime state.
- Run static review, type checks, builds, existing smoke tests, dependency scans, and read-only performance analysis.
- Produce audit reports, remediation plans, performance recommendations, product-improvement proposals, and verification evidence.

## Approval Boundaries

- Any code, database migration, dependency, configuration, or CI/CD modification.
- Starting, stopping, rebuilding, or cleaning Docker containers or volumes.
- Database migration, seed, repair, or any database write.
- Use of real third-party credentials or ERP, email, or MCP external calls.
- Git commit, push, pull request, deployment, or production-environment operation.

## Prohibited Actions

- Do not expose or record secrets, tokens, passwords, or connection strings.
- Do not delete data, containers, volumes, migrations, or user changes.
- Do not bypass RBAC, service-account permissions, audit logging, or ERP boundaries.
- Do not move Dashboard-owned catalog or pricing master-data responsibility into ERP.
