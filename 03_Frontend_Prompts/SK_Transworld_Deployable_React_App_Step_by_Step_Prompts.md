# SK Transworld Logistics — Deployable React App Step-by-Step Prompt Pack

## How to use
1. Keep `SK Transworld Logistics — Master Project Context.md` in the project root.
2. Keep the original BRD DOCX, requirements PDF, project overview and RoutaX reference screenshots available to the coding agent when possible.
3. Run one step prompt at a time in VS Code Agent mode.
4. Do not paste all prompts at once. Review the output, run the checks, and approve before moving to the next step.
5. Prompt 1 is read-only. Later prompts implement only their stated scope.
6. Deployment preparation is included, but actual deployment/cloud changes require your explicit approval.

## Global instruction for every step
Before acting, read `SK Transworld Logistics — Master Project Context.md` from the project root. Inspect the current code before editing. Treat the current prompt as the scope for this step only. Preserve the existing framework, routes, styles, dependencies, working features and real integrations. Reuse shared Job No.-centred records; do not create disconnected mock data. Do not invent unclear business policy; mark it Pending Business Clarification. Label external integrations demo/unconfigured unless verified. Run relevant checks, fix issues introduced by the step, report changed files and actual test results, and wait for approval before continuing.


## STEP 1 — Repository audit and implementation plan
**Goal:** Inspect first; do not edit code yet.

Read `SK Transworld Logistics — Master Project Context.md` (use the exact filename that exists in my root folder) completely before acting. Also inspect the original BRD DOCX, requirements PDF, project overview and RoutaX reference screenshots if they are available in the workspace.

Inspect the existing repository and report:
- React framework/version, TypeScript status, package manager, routing, styling/UI library, icon/chart libraries, state management and API/data layer.
- Current routes/screens, implemented features, reusable components, tests, lint/type-check/build scripts and deployment configuration.
- Existing environment variables and integrations by variable NAME only; never print secret values.
- Gaps against the master context and a phased plan to make the existing app a deployable frontend.
- Recommended deployment target based on the current stack and any repository configuration; do not deploy yet.

Do not modify files in this step. Preserve the current architecture and working functionality. If the master context or source documents conflict, identify the conflict and mark it Pending Business Clarification. Stop and wait for my approval.

## STEP 2 — Establish deployment-safe project conventions
**Goal:** Make the existing project maintainable without rebuilding it.

Using the approved audit plan and the master context, implement only necessary project foundations. Preserve the existing framework, router, dependencies and folder structure wherever possible.

- Confirm scripts for development, lint, type-check, test and production build; add missing scripts only when compatible with the current stack.
- Check TypeScript strictness and existing lint/format conventions. Improve incrementally without unrelated refactoring.
- Establish or document clear boundaries for pages, shared components, data/types, calculation helpers, assets and styles according to the current architecture.
- Ensure configuration is environment-driven where appropriate and secrets are never hard-coded.
- Add a useful `.env.example` containing variable names and safe placeholder values only if environment configuration is needed.
- Verify the app starts and builds before implementing more screens.

Do not add unnecessary packages or real backend integrations. Run available checks and report changed files and actual results. Wait for approval.

## STEP 3 — Design system and application shell
**Goal:** Build the visual frame used by every screen.

Read the master context and implement the shared SK Transworld Logistics app shell using the existing project conventions.

Visual direction from my supplied RoutaX reference:
- Pale cool blue-gray canvas around #E9EDF6.
- White/off-white rounded cards, subtle borders and soft shadows.
- Primary blue #3783FF; amber #EFB54A for warnings/attention.
- Near-black primary text and muted slate secondary text.
- Compact top bar with SK Transworld Logistics branding, global search, notifications, profile/settings and relevant quick actions.
- Navigation for Dashboard, Quotations & Tariffs, Jobs/Dockets, Freight Forwarding, Customs, Haulage/Fleet, Warehouse, Documents, Billing & Finance, Job Costing/Reports, Alerts, Customer Portal and Master Data/Settings where supported by the current routing structure.
- Consistent buttons, inputs, tables, badges, typography, spacing, radii, focus states and page headings.
- Responsive desktop/tablet/mobile behavior with a collapsible navigation and no horizontal page overflow.

Do not copy RoutaX branding. Use existing UI/icon packages and create placeholder route states only as appropriate. Do not build all module content in this step. Run checks and report.

## STEP 4 — Shared types, mock data and business calculations
**Goal:** Create one consistent source of demo data for the whole app.

Implement a shared typed data model following the master context. Reuse existing data/API patterns. The core relationship is one Job No. connecting customer, quotation, shipment/container, forwarding, customs, haulage, warehouse, documents, charges/costs, invoices, vouchers and job profitability.

Create or adapt coherent demo records for customers, suppliers/carriers, quotations, jobs/dockets, containers and BL/HBL/MBL, milestones, customs declarations, trucks/trailers/drivers/trips, warehouse receipts/GRN/stock movements, documents, charge suggestions, supplier costs, payment requests, invoices, e-invoice demo statuses, payment vouchers, alerts and activity history.

- Use Malaysian logistics examples and RM where suitable; mark example numbering/rates as illustrative.
- Support multiple containers/trips/documents/charges per Job No. where the data requires it.
- Keep operational status separate from financial status.
- Keep actual and estimated costs distinct.
- Derive dashboard totals, counts, chart values, margins, free days and alert counts from shared records.
- Add calculation helpers and tests/sanity checks.
- Label all mock data clearly. Do not replace a real working API with mock data.

Do not hard-code independent totals in UI components. Run tests/build/type-check and report.

## STEP 5 — Management dashboard
**Goal:** Create the executive overview with real derived values.

Implement the Management Dashboard using shared data and the design system.

Include:
- Operational KPIs: deliveries today, containers arriving, customs pending, EDO pending, warehouse deliveries and trucks required, selecting only the relevant metrics for a clear layout.
- Finance KPIs: today's revenue, month-to-date revenue, outstanding customer payments, supplier payable and job profitability.
- Department breakdown for forwarding, customs, haulage and warehouse.
- Shipment/job table with Job No., customer, container, milestone, ETA/ETD, owner, operational status and financial/billing status.
- Alerts for free-time expiry, EDO not released, overdue payments, long-stay cargo, missing documents and vehicle compliance.
- Recent activity and quick actions.
- Filters/date range and drill-down links to the underlying records.

Every KPI and table must derive from shared data and reconcile with the records shown. Include empty states and a Demo Data indicator. No fake live integrations. Test filters, totals and drill-downs; run checks and report.

## STEP 6 — Jobs, dockets and shared Job Detail workspace
**Goal:** Implement the central record and cross-module navigation.

Implement Jobs/Dockets and Job Detail using the same shared Job No. records.

Jobs list:
- Search by Job No., customer, container, BL/HBL/MBL, vessel and status when fields exist.
- Filter by customer, service/department, operational status, financial status and date range.
- Sortable table showing Job No., customer, service/shipment type, containers, ETA/ETD, owner, operational status, billing state and missing-document indicator.
- Create-job form with validation and illustrative local Job No. generation.
- Accepting a quotation should carry forward available customer/service/rate values.

Job Detail:
- Keep Job No. visible and consistent across Overview, Forwarding, Customs, Haulage, Warehouse, Documents, Charges & Costs, Invoices, Job Costing and Activity/Audit tabs.
- Show linked containers, trips, documents, charges/costs and invoices.
- Show operational status separately from financial status.
- Surface performed-but-unbilled work, missing required documents and close-out blockers.
- Prevent mock closure while required billing/documents remain unless an explicit approved exception is recorded.

Use shared data; don't duplicate records per page. Test search, filters, create validation, tabs and record links. Run checks and report.

## STEP 7 — Truck, trailer and cargo-bay visualization
**Goal:** Build the key visual feature inspired by the supplied screenshot.

Implement the Haulage/Fleet screen and a reusable truck/cargo visualization. Use my RoutaX screenshot as visual inspiration only; use SK Transworld branding.

- Make a recognisable side-view tractor-trailer the large central focal point. Prefer a local asset already in the repository; otherwise create a self-contained inline SVG/CSS illustration with cab, trailer and wheels. Do not depend on a remote image URL.
- Within/alongside the trailer, show a cargo-bay layout with labeled slots, cargo/container/job references, weight and occupied/empty status. Blue-highlight selected/occupied slots; use neutral styling for empty slots.
- Put a selectable truck list beside the visualization on desktop and below it on smaller screens.
- Selecting a truck updates driver, trip, route, capacity and cargo assignments from shared data.
- Clicking a cargo slot opens its linked Job No./container details.
- Add route-map placeholder, trip milestones, expenses/profit, POD status and road-tax/insurance reminders where supported by the data.
- If no real map/GPS integration exists, label the route and GPS as demo/not connected.
- Illustrative calculation may show RM1,200 billing − RM700 trucking − RM80 toll − RM50 other = RM370 profit, labelled as example data.

Interactions must work with local state and shared records. Do not imply live GPS, camera or telephony. Test truck selection, cargo links, responsive layout and calculations. Run checks and report.

## STEP 8 — Freight forwarding, containers and customs
**Goal:** Implement shipment milestones and customs lifecycle screens.

Implement Freight Forwarding, Container Tracking and Customs Clearance using shared Job No. records.

Forwarding/container screens should support booking, carrier/co-loader, vessel/voyage, ETA/ETD, FCL/LCL, import/export/transshipment, BL/HBL/MBL, multiple containers, free days, demurrage/detention, milestone history, tracking source and last-updated time.

Customs should represent K1, K2, K3, K4, K5, K8, ZB, DG declaration, DSO and IGM where applicable; duty/SST; customs payment; SSR; inspection; approval/release; EDO; gate pass; and delivery lifecycle.

Show status, owner, timestamp and supporting document/evidence for events. Document upload does not mean customs approval. Clearly distinguish manual/imported/integration-verified tracking where relevant. Any real customs/carrier integration must remain labelled demo/unconfigured unless verified in the repository.

Add search/filter, pending/overdue states, milestone update interactions and linked Job Detail navigation. Test complete/incomplete chains and unknown searches. Run checks and report.

## STEP 9 — Warehouse, inventory, storage and handling
**Goal:** Add inventory movement and explainable storage billing.

Implement Warehouse & Inventory and Storage Billing & Handling using shared job records.

Include inbound receiving/unloading, cargo count, damage/shortage evidence, GRN, palletisation/labeling, stock movement, SKU, carton, pallet, CBM, weight, bin/rack, batch/lot and optional expiry, plus outbound pick/pack/load/dispatch/POD.

Storage billing must show customer-specific free days, chargeable period/quantity, rate basis, calculation breakdown, draft charge suggestions, adjustment reason and approval state. Illustrative sample rates from the requirements (3 free days then RM3/CBM/day; RM8/pallet/day; RM5/carton/month) must be labelled examples pending confirmation.

Prevent duplicate billing for the same event/period in mock logic. Do not silently overwrite stock discrepancies; record mock adjustments. Keep rounding/free-day policy configurable if not confirmed. Add search/filter and job/container drill-down. Test calculations and stock/charge relationships; run checks and report.

## STEP 10 — Digital documents and audit/activity
**Goal:** Make the digital job folder usable and connected.

Implement document management with one searchable folder per Job No. Support commercial invoices, packing lists, BL/HBL/MBL, customs documents, EDO, LOI, delivery order, gate pass, POD, photos and correspondence.

Show document type, linked Job No./container/trip/invoice, uploader, timestamp, version/history, access classification and required/missing status. Add mock upload, classify, preview/open and download interactions. If no backend exists, clearly label local demo behavior and do not claim files persist to a server.

Show an expected-document checklist based on job/service type where supported. Preserve activity/audit events for status changes, approvals and document versions. Only explicitly approved/shareable documents should appear in the customer portal. Upload must not imply customs release.

Test missing documents, filters, unknown searches, access classification and links from related screens. Run checks and report.

## STEP 11 — Billing, finance, e-invoice and job costing
**Goal:** Connect operational events to finance screens and profitability.

Implement Billing & Finance and Job Costing using shared records.

- Create reviewable draft charge suggestions from forwarding, customs, haulage, warehouse/storage and handling events.
- Show source event/rate, Job No., department, quantity/unit, amount, evidence, approval and posting state.
- Highlight performed-but-unbilled work.
- Show supplier costs, reimbursement/payment requests, customer invoices, Finance review/approval, e-invoice demo status/reference/error, email status, supplier payment vouchers, manual vouchers, receivables/payables and bank reconciliation.
- Show revenue, actual/estimated direct cost, gross profit and margin by job/customer/shipment/department with drill-down to source lines.
- Include P&L and Balance Sheet report entry points without inventing unsupported accounting policies.
- Use controlled mock cancel/reversal flows instead of silently deleting posted finance records.
- Label LHDN MyInvois, email, bank feeds and all other external integrations demo/unconfigured unless verified as connected.

Use RM and the illustrative haulage calculation from the master context. Test totals, margins, approval states and linked invoices. Run checks and report.

## STEP 12 — Alerts, role-aware views and customer portal
**Goal:** Complete exception handling and safe customer-facing screens.

Implement Alerts & Reminders and Customer Portal using the master context.

Alerts include free-time expiry, EDO not released, overdue customer payment/ageing, long-stay cargo, missing documents, road tax/insurance due and overdue milestones. Each alert has severity, linked record, owner, due date/age, acknowledgement, status, escalation and next action. Add acknowledge/assign/note/resolve mock interactions.

Customer Portal:
- Distinct customer-facing layout.
- Only the selected demo customer's jobs/shipments, container numbers, status, ETA, approved documents and permitted customer-facing charge categories.
- Never expose supplier costs, internal notes, audit-only details or internal profit margins by default.
- Label the portal demo mode; a frontend role selector is not server-side security.

If real auth/roles exist, reuse them. Otherwise provide a clearly labelled demo role switch only for UI demonstration. Test customer scoping, role views, alert actions and navigation. Run checks and report.

## STEP 13 — Full UI integration and responsive polish
**Goal:** Make the screens feel like one product rather than separate demos.

Review every implemented screen against the master context and current repository.

- Ensure navigation, breadcrumbs, global search, page titles, buttons, tabs, dialogs, tables and status labels are consistent.
- Verify every linked screen uses the same Job No. and shared records.
- Verify KPI totals reconcile with lists and detail screens.
- Verify operational and financial status are separate.
- Make truck/cargo visualization a prominent and responsive feature.
- Check desktop, tablet and mobile widths; fix horizontal overflow, clipped controls, unreadable tables and excessive empty space.
- Add accessible labels, keyboard support, visible focus, contrast and loading/empty/error states.
- Remove dead links, placeholder buttons that do nothing, console errors and duplicate demo data.
- Do not introduce unrelated redesigns or new major modules.

Run available lint, type-check, tests and production build; fix issues introduced. Report screens reviewed, issues fixed and actual check results. Wait for approval.

## STEP 14 — Production-readiness and deployment preparation
**Goal:** Prepare a deployable React frontend without claiming deployment is complete.

Prepare the existing application for production deployment. First inspect the actual stack and choose deployment settings that match it; do not assume Vite, Next.js, CRA, a hosting provider or a backend unless the repository confirms it.

Check and implement where applicable:
- Production build works from a clean dependency install using the existing package manager and lockfile.
- Correct build/start/preview scripts and documented commands.
- Environment variables are documented in `.env.example` with safe placeholders only; no secrets in source, logs or committed files.
- API base URLs and environment-specific configuration are not hard-coded to localhost in production paths.
- Client-side routing fallback is configured for the selected static host if needed.
- Asset paths, fonts, SVGs and images load correctly in production build.
- No unnecessary large dependencies, obvious unused imports, runtime console errors or broken links.
- Responsive/accessibility smoke checks across dashboard, jobs, truck/cargo, documents, finance and portal.
- Error/empty states for missing data and failed requests, following existing app patterns.
- Security review of exposed configuration and demo role controls; never put private credentials in frontend environment variables.
- README includes prerequisites, local setup, environment configuration, test/build commands, deployment steps for the chosen platform and known limitations.
- If the app is frontend-only, state that records are mock data and do not persist across devices unless a real backend exists.

Do not deploy or create cloud resources without my explicit approval. Do not claim production readiness if tests/build fail or critical requirements remain unimplemented. Run clean-install/build/test checks where feasible and report exact results plus any blockers.

## STEP 15 — Deployment handoff and final verification
**Goal:** Produce a clear handoff checklist and wait before deploying.

Perform the final pre-deployment verification of the SK Transworld Logistics React frontend.

1. Run the actual production build and available lint, type-check and test scripts.
2. Verify the configured production output and hosting/routing assumptions for the detected framework.
3. Check for missing environment variables by name only; never print secret values.
4. Check links, images/SVGs, navigation, forms, search/filter, job drill-downs, truck/cargo selection, calculations, alerts and customer scoping.
5. Confirm the master context and original BRD terminology have been respected, and unresolved requirements are marked Pending Business Clarification.
6. Summarize:
   - Implemented screens and interactions.
   - Changed files and key components.
   - Commands run and exact pass/fail results.
   - Known bugs, limitations and remaining requirements.
   - Deployment platform recommendation grounded in the current project.
   - Required environment variable names and safe setup instructions.
   - Exact deployment commands/steps.
7. Do not expose secrets, claim integrations are live, or claim the app is deployed if it is not.
8. Do not deploy, purchase services, create cloud resources or modify production systems without my explicit approval.

Stop after the handoff report and wait for my approval.
