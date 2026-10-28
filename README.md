# SK Transworld Logistics frontend

This repository is the React frontend prototype for SK Transworld Logistics Malaysia's combined logistics and accounting system. The management dashboard derives operational and financial summaries, department revenue, shipment rows, alerts and activity from the shared demo records, with date and customer filters. The central business record is one Job No. linking logistics activity, documents, charges, costs and finance. The BRD and requirements are drafts pending client validation; unresolved rules remain Pending Business Clarification.

The current UI provides the shared SK Transworld workspace shell, derived management dashboard, a Quotations & Tariffs presentation workspace using shared illustrative quotations, searchable Jobs / Dockets register, cross-module Job Detail workspace, Haulage / Fleet, Freight Forwarding and Container Tracking, Customs Clearance, Warehouse / Inventory with storage charge suggestions, Job No.-linked Digital Documents, Billing & Finance / Job Costing, exception management, and a customer-scoped portal preview. Quotation creation, search and filters are presentation placeholders; tariff data and route details are not configured. Alerts support local acknowledgement, assignment, notes, escalation and resolution. The customer portal shows only the selected demo customer's jobs, shipment/container status, available customer-approved documents, and invoice-linked customer charge categories; supplier costs, internal notes, audit activity and internal profit are excluded. Its role selector is a frontend-only demonstration and is not authentication or server-side authorization. Document uploads, finance and alert actions, approvals, e-invoice/email states and reconciliation updates are local demo records only; file bytes are not persisted to a server, and document presence does not indicate customs approval or release. No accounting ledger, LHDN MyInvois, email or bank-feed integration is configured. Operational, customs, warehouse, document, finance and alert updates remain local demo interactions. See [README_FIRST.md](./README_FIRST.md) and [SK_Transworld_Master_Project_Context.md](./SK_Transworld_Master_Project_Context.md) for project guidance and requirements. The supplied truck/cargo image is visual inspiration only; use SK Transworld branding.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` (the repository's `.nvmrc` selects Node 22.23.4)
- pnpm 9.15.9

Install dependencies and start the development server:

```sh
pnpm install
pnpm dev
```

## Checks and build

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

Tests use Node's built-in test runner and are compiled with the strict TypeScript configuration to a temporary directory under `node_modules/`. Shared illustrative business records are in `src/data/demoData.ts`; calculations and relationship validation are in `src/data/calculations.ts`; job search, filtering, local illustrative job creation and close-out readiness helpers are in `src/data/jobs.ts`; forwarding filters, container free-time and customs release workflow helpers are in `src/data/shipments.ts`; warehouse stock-balance and storage-billing helpers are in `src/data/warehouse.ts`; customer-safe portal data scoping is in `src/data/customerPortal.ts`; and alert age display is in `src/data/alerts.ts`. Rates, job numbering and other unconfirmed rules are explicitly illustrative and remain Pending Business Clarification.

## Current project structure

- `src/main.tsx` bootstraps React; `src/App.tsx` contains the responsive application shell.
- `src/App.css` and `src/index.css` contain component-level and global styles.
- `src/data/model.ts`, `src/data/demoData.ts`, `src/data/calculations.ts`, `src/data/jobs.ts`, `src/data/shipments.ts` and `src/data/warehouse.ts` contain shared business types, illustrative records, calculations and job/shipment/warehouse workflow helpers.
- `src/assets/` contains imported assets; `public/` contains files served as-is.
- No API/data service layer exists yet.

## Deployment and integrations

Vite builds static files to `dist/`, suitable for a static hosting provider. No provider-specific deployment configuration is present. There are no configured environment variables, backend APIs or live GPS, carrier, customs, e-invoice, bank, email or AI integrations. Any prototype data or integration states must be labelled as demo/unconfigured.
