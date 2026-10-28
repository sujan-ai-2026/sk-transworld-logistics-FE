# SK Transworld Logistics — Master Project Context
**Canonical project brief for all step-by-step frontend implementation prompts**  
**Project:** SK Transworld Logistics Malaysia — Combined Logistics Management System (CLMS) + Accounting System  
**Status:** Frontend mockup / prototype requirements; source documents are drafts pending client validation.

## 1. How this file must be used

This is the canonical, persistent project context for the SK Transworld Logistics frontend project. Read this file before acting on any implementation prompt. Every step-specific prompt must be interpreted together with this file, the existing repository, the source BRD DOCX, the requirements PDF, the user's RoutaX-style reference screenshots, and any project overview provided in the workspace.

Priority order:
1. Existing repository architecture and working functionality — preserve unless explicitly asked to change.
2. The SK Transworld Logistics BRD DOCX — primary source for business terminology and the combined operations + finance scope.
3. The companion requirements PDF — additional functional details, roles, screen requirements, workflows, dashboards, acceptance criteria and open questions.
4. The user's supplied RoutaX-style screenshots — visual inspiration only; do not copy RoutaX branding.
5. This master context — shared interpretation and implementation guardrails.
6. The current step prompt — defines the scope to implement in this turn only.

If sources conflict or a policy is unclear, do not silently invent a decision. Preserve source wording, record the conflict or uncertainty, and label it **Pending Business Clarification**. Do not treat examples or proposed enhancements as approved business policy.

## 2. Project objective

Build a modern, responsive B2B web application mockup for SK Transworld Logistics Malaysia that connects logistics operations and accounting through one shared Job No. The frontend should demonstrate an end-to-end workflow spanning quotations, job/docket creation, forwarding, customs clearance, haulage/trucking, warehouse operations, storage/handling, digital job documents, customer portal, billing, accounts, job costing, alerts, management dashboards and reports.

The prototype should be credible enough for stakeholder walkthroughs and requirement validation. It is not a claim that backend services or external integrations are live.

## 3. Core business problem and outcomes

The supplied BRD identifies key needs including missed billings, manual supplier invoice recording, hard-copy job documents, manual job detail entry, limited visibility of profit per job, and disconnected operations/finance records. Some problems are inferred in the source and must be confirmed.

The UI should demonstrate these target outcomes:
- One Job No. links the job and its operational, document and financial records across departments.
- Charges and supplier costs are traceable to their source and the related job.
- Performed-but-unbilled services are visible before job closure.
- Job profitability can be inspected by job, customer, shipment and department.
- Job documents are searchable in a digital job folder.
- Management can see daily work, follow-ups, financial summaries and exceptions.
- Customers can view only their own shipment information, approved documents and permitted charge categories.
- AI-assisted job capture proposes extracted information for human review; it must not silently approve extracted values.

## 4. The central data principle: one shared Job No.

Every shipment/job should use one Job No. as the cross-department key. The same record relationships must be reused by:
- Customer and quotation
- Job/docket and job cover sheet
- Shipment, booking, container(s), BL/HBL/MBL, vessel/voyage and milestones
- Customs declarations, duty/SST, SSR, inspection/release, EDO and gate pass
- Truck, trailer, driver, trip, trip expenses and POD
- Warehouse receipt/GRN, stock movements, storage and handling events
- Digital documents and activity/audit events
- Operational charge suggestions, supplier costs and payment/reimbursement requests
- Customer invoices, e-invoice mock status, supplier payment vouchers and bank reconciliation
- Job revenue, cost, gross profit and margin

Do not create disconnected sample data separately for each page. A Job No. may relate to multiple containers, trips, documents, charges, costs and invoices when the mock data indicates that relationship. Do not assume one-to-one relationships where the source records indicate otherwise.

Keep **operational status** separate from **financial status**. For example, a delivered job may still be unbilled, unpaid or unreconciled.

## 5. Functional modules and expected screens

### 5.1 Management dashboard
Show operational KPIs such as deliveries today, containers arriving, customs pending, EDO pending, warehouse deliveries and trucks required. Include financial summaries such as today's revenue, month-to-date revenue, outstanding customer payments, supplier payable, job profitability and department-level revenue. Provide exception lists, recent activity, quick actions and drill-downs.

### 5.2 Quotations and tariffs
Customer quotations with service lines, rates, units/currency, validity and status. Supplier/carrier rates should support effective dates and applicable units/currency in the mockup. Accepting a quotation should create or link a job and carry forward available customer/service/rate information.

### 5.3 Jobs / dockets
Searchable jobs list; create-job flow; unique illustrative Job No.; customer/service/shipment details; job cover sheet; workflow progress; owner; milestones; documents; charge/billing status; missing-document indicators and close-out blockers. Search should support Job No., customer, container, BL, status, vessel and ETA when the data exists.

### 5.4 Job detail workspace
Keep the Job No. visible and consistent. Provide tabs or sections for Overview, Forwarding, Customs, Haulage, Warehouse, Documents, Charges & Costs, Invoices, Job Costing and Activity/Audit Trail. Every linked screen should navigate back to the same shared job record.

### 5.5 Freight forwarding and container tracking
Support booking, carrier/co-loader, vessel/voyage, ETA/ETD, FCL/LCL, import/export/transshipment, BL/HBL/MBL, container list, free days, demurrage/detention, milestones, forwarding revenue, direct costs and job profit/loss.

### 5.6 Customs clearance
Represent declaration types K1, K2, K3, K4, K5, K8 and ZB, plus DG declaration, DSO and IGM where applicable. Show duty/SST, customs payment, SSR, inspection, customs approval/release, EDO, gate pass and delivery lifecycle. Unclear terms or actual forms in use must remain configurable/Pending Business Clarification.

### 5.7 Haulage / trucking / fleet
Maintain mock truck, trailer and driver records. Support trip planning, job/container assignment, pickup, delivery, port appointment, empty pickup, laden delivery, empty return, trip expenses, subcontracted trucking and POD with signature/photo placeholder. Road tax/insurance reminders may be shown. GPS/telematics is only a demo indicator unless a verified integration already exists.

### 5.8 Truck and cargo visualisation
Use the user's RoutaX-style reference as visual inspiration: a large central side-view truck/trailer as the main focal point, a cargo bay/slot layout with labels, selected/occupied slots highlighted in blue, a compact fleet list on the right, and lower cards for route, trip progress, expenses/profit, POD or vehicle health where appropriate.

Build the truck illustration from an existing local asset if available; otherwise use a self-contained SVG/CSS illustration. The vehicle should be recognisable as a tractor-trailer with a cab, trailer and wheels, not just a generic rectangle. Cargo slots must be selectable and tied to shared Job No./container/trip records. Empty/occupied states must be clear. On mobile, stack the truck visualization and fleet list. Do not copy RoutaX branding or imply that the reference itself provides live telemetry.

### 5.9 Warehouse, inventory, storage and handling
Represent inbound receipt, unloading, cargo count, damage/shortage evidence, GRN, palletisation/labelling, stock movements, customer/job/container/SKU/carton/pallet/CBM/weight/bin/rack/batch/lot and optional expiry data, plus outbound pick/pack/load/dispatch/POD. Storage billing should show customer-specific free days, rate basis, chargeable quantity/period, a transparent calculation, draft charge suggestion and review/approval state.

Illustrative examples from the requirements include Customer A: 3 free days then RM3/CBM/day; Customer B: RM8/pallet/day; Customer C: RM5/carton/month. Treat these as examples only, not approved policy. Avoid duplicate billing for the same event/period.

### 5.10 Digital document management
One searchable digital folder per Job No. with commercial invoices, packing lists, BL/HBL/MBL, customs documents, EDO, LOI, delivery order, gate pass, POD, photos and correspondence. Show type, linked entity, uploaded by/date, version/history and access classification. Provide mock upload/preview/download interactions if no backend exists. Uploading a file must not imply customs approval or release. Only explicitly approved/shareable documents should appear in the customer portal.

### 5.11 Billing and finance
Represent operational charge suggestions, supplier costs, payment/reimbursement requests, customer invoices, Finance review/approval, e-invoice mock status/reference/error, email-send status, supplier payment vouchers, manual vouchers, receivables/payables, bank reconciliation and monthly Profit & Loss / Balance Sheet report entry points. Draft charge suggestions must remain drafts until reviewed/approved. Do not silently delete posted finance records; use a mock cancel/reversal flow with reason if needed.

### 5.12 Job costing and reports
Show revenue, actual/estimated direct cost, gross profit and margin by Job No., customer, shipment and department. Drill down to source charge/cost, applied rate, evidence, approval and posting state. Example haulage calculation from the source: RM1,200 billing − RM700 trucking − RM80 toll − RM50 other cost = RM370 profit. Label example values as illustrative.

### 5.13 Alerts and reminders
Show free-time expiry, EDO not released, overdue customer payments/ageing, long-stay cargo (30 days is an example), missing documents and road tax/insurance due. Each alert should include severity, linked record, owner, due date/age, acknowledgement, status, escalation and resolution/next action.

### 5.14 Customer portal
A distinct customer-facing layout scoped to a selected customer organisation. Show its own Job/Shipment No., container No., status, ETA, approved documents, customer-facing charge categories (forwarding, haulage, storage, handling), charge status and last-updated time. Do not expose internal supplier costs, internal notes or profit margins by default. A frontend demo role switch is not real server-side security.

### 5.15 Master data and access
Represent customers, suppliers, carriers, rates, trucks, trailers, drivers, warehouses/locations and role-aware views where in scope. If authentication/roles already exist, preserve the project's implementation. If not, a clearly labelled demo role selector may illustrate different screens; do not claim it enforces backend security.

## 6. Visual design system

Use the reference screenshots for design direction:
- App canvas: pale cool blue-gray, approximately #E9EDF6.
- Cards: white/off-white, rounded corners, subtle borders and soft shadows.
- Primary blue: #3783FF.
- Amber attention/warning: #EFB54A.
- Text: near-black primary, muted slate secondary.
- Compact top navigation and KPI strip where appropriate.
- Clear page hierarchy, compact high-information tables, restrained charts, consistent spacing, typography, radii, inputs, buttons and badges.
- Keep the truck/cargo visualization prominent on the Haulage/Fleet screen.
- Avoid decorative clutter, excessive gradients, overly large empty spaces and unnecessary charts.
- Use accessible contrast, semantic HTML, labels, keyboard navigation, visible focus states, and clear loading/empty/error states.
- Responsive desktop/tablet/mobile layouts with no unintended horizontal overflow.
- Use the existing design system, UI library, icon library and chart library before introducing dependencies.

## 7. Shared dynamic demo data and calculations

Use a coherent typed data model (TypeScript if the project uses it) and shared central mock data. Derive all displayed values from these records:
- KPI counts, totals, percentages, chart series and table rows
- Revenue, actual/estimated costs, gross profit and margin
- Department charge totals
- Free days remaining and illustrative storage charges
- Alert counts and ageing
- Truck/cargo assignments, trip progress and POD state
- Invoice, voucher, receivable/payable and reconciliation statuses

Search, filters, sorting, date ranges, tabs, row selection and drill-downs should update the visible records and relevant totals. Keep sample values consistent across dashboard, list, detail and report screens. Include a clear **Demo Data** indicator. Mock interactions may use local app state unless the project already has a mock persistence pattern.

## 8. Technical implementation rules

1. Inspect the repository before editing. Reuse its existing framework, router, file structure, styling, state management, API layer, components and dependencies.
2. Do not replace the stack, regenerate the app from scratch, or rewrite unrelated working features.
3. Implement only the scope of the current step prompt. Do not try to complete every module in one turn.
4. Build reusable components and separate shared types, data, calculation helpers and page layouts according to existing conventions.
5. Use shared records rather than duplicating demo data in components.
6. Keep interactions functional: buttons, filters, search, tabs, forms, dialogs, row selection and navigation should do what their labels promise.
7. Add dependencies only when needed, after checking existing packages and choosing a lightweight option.
8. Preserve existing API/backend integrations. Do not replace real data flows with mock data if working integration already exists; adapt the mockup to the existing architecture.
9. Do not hard-code unresolved business policy. Mark it Pending Business Clarification.
10. After each step, run relevant lint, type-check, tests and build scripts that exist. Fix issues introduced by the step. Report commands and actual results; never claim a check passed if it was not run.
11. Before finishing each step, report changed files, functionality delivered, tests/results, known limitations and what should be done next. Wait for the user's review before continuing.

## 9. Integration honesty and security boundaries

Do not claim these are connected unless verified in the existing repository: GPS/telematics, camera feeds, carrier/port tracking, customs lodgement, LHDN MyInvois or middleware, bank feeds, invoice email delivery, AI document extraction, or document storage backend. Use labelled demo/unconfigured states and mock responses.

Do not present frontend-only role hiding as security. Customer-facing screens must not display internal supplier costs, profit margins, internal notes or unapproved documents by default. Do not imply a QR, document upload, mock GPS dot or local status change proves authenticity or a real-world event.

## 10. Pending Business Clarification — do not silently decide

Keep unresolved decisions visible in notes or a tracked list:
- Exact Job No. numbering rule.
- Currency and multi-currency requirements, exchange rates and rounding.
- Tax/SST treatment and approved accounting formulas.
- Actual customs declaration types/terms used, and customs lodgement channel.
- E-invoice provider/route, credentials and submission rules.
- Bank statement formats and reconciliation rules.
- Approval thresholds and separation of duties.
- Finance posting, reversal, period-lock and month-end close rules.
- Customer-specific free days, storage rounding, billing periods and minimum charges.
- Actual GPS/telematics and port/carrier tracking providers.
- AI document extraction scope, source documents, confidence and human-review rules.
- Email provider, document retention, migration, branches/users, transaction volumes and time zone.
- Reporting formulas and management KPI targets.
These documents are drafts pending client validation. Treat examples and proposed modernisation options as illustrative until approved.

## 11. Definition of done for the frontend mockup

The mockup is ready for stakeholder review when:
- The core screens exist and are navigable.
- The same Job No. links consistent data across departments.
- KPI totals and calculations reconcile to shared demo records.
- Search, filters, tabs, drill-downs and main local interactions work.
- The truck/cargo screen has a recognisable responsive truck/trailer illustration and selectable cargo slots linked to jobs/containers.
- Operational and financial statuses are clearly separate.
- Performed-but-unbilled work and missing-document/exception states are visible.
- Job costing shows explainable revenue, cost, gross profit and margin.
- Customer portal demo scope excludes internal finance information by default.
- External integrations are honestly labelled as demo/unconfigured.
- Responsive/accessibility checks and available project scripts have been run.
- The final report lists files changed, checks/results, assumptions and pending clarifications.

## 12. Instruction to every future coding agent

Read this entire `SK_Transworld_Master_Project_Context.md` before acting. Then read the current step-specific prompt and implement only that step. Inspect current code before edits, preserve the architecture, reuse shared data and prior completed work, and avoid duplicating components or rebuilding finished screens. If a step prompt conflicts with this master context or the source documents, stop and identify the conflict rather than silently guessing. Finish with a concise implementation/test report and wait for approval before the next step.
