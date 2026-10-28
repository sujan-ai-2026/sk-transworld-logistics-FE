# Logistics Dashboard UI Agent Instructions

## Mission
Build a polished, production-quality React frontend for a logistics and fleet-management platform, using the user's reference screenshots as visual direction. The target is a premium fleet operations dashboard with a light, glassy interface, a large truck/cargo visualization, fleet KPIs, route map, vehicle health, camera preview, and a truck list.

## First steps
1. Inspect the existing project before editing anything.
2. Identify the framework, package manager, routing, styling system, icon library, existing components, and current app entry point.
3. Reuse the project's current conventions and dependencies. Do not replace the stack or rewrite unrelated parts.
4. Give a short implementation plan, then build the UI in small, testable steps.
5. Run the available lint, type-check, and build commands. Fix issues introduced by your changes.

## Visual direction
- Product concept: "RoutaX" fleet management dashboard.
- Overall canvas: cool, very light blue-gray background (#E9EDF6 or a close existing theme token).
- Surfaces: white/off-white cards with generous rounded corners, subtle borders, and soft low-contrast shadows.
- Primary accent: vivid blue (#3783FF).
- Secondary accent: warm amber (#EFB54A).
- Text: near-black for primary labels and muted slate gray for secondary labels.
- Use a compact top navigation bar with brand mark, navigation controls, KPI counters, notifications, search, settings, and profile.
- Main content should feel information-dense but organized; avoid oversized empty areas.
- Use consistent spacing, alignment, radii, typography, and icon sizes.
- Prefer restrained glassmorphism: slight translucency and soft shadows only where useful. Keep contrast and readability high.
- Use responsive behavior rather than letting desktop dimensions overflow on smaller screens.

## Main dashboard structure
1. **Top navigation**
   - Brand mark and "RoutaX" wordmark.
   - Navigation items for Home, Fleet management, Map, Operations/vehicles, and Analytics.
   - KPI strip: active vehicles, vehicles in maintenance, average efficiency, cargo in transit.
   - Actions: notifications with badge, search, settings, avatar.
2. **Vehicle summary card**
   - Vehicle ID and active status.
   - Vehicle model, location/route, payload, used volume, and used capacity.
   - Driver name/avatar and call/contact action.
   - Fuel and temperature mini-metrics.
3. **Cargo/truck visualization**
   - Make the cargo layout a clear, large focal point.
   - Show labeled cargo slots/boxes, weights, occupied/available states, and selection state.
   - Selected cargo slots use blue fills and simple line/grid texture if practical.
   - Use a real available project asset if one exists. If no truck image exists, use a robust placeholder/illustration or a CSS/SVG truck silhouette; do not depend on a remote image that may fail.
4. **Truck list**
   - Scrollable list of vehicles with truck thumbnail/silhouette, ID, model, route status, and capacity bar.
   - Selected vehicle has a visible blue border/highlight.
   - Clicking a row updates the selected vehicle and summary details where feasible.
5. **Lower analytics row**
   - Route map card with a path and waypoints. Use an existing map integration if present; do not add a paid map dependency without approval. If no map integration exists, make a self-contained stylized map placeholder.
   - Daily active-time card with progress.
   - Average-speed card with a simple gauge/progress visualization.
   - Mechanical-condition card with values for engine, brakes, tires, oil, and suspension.
   - Camera preview card with a safe placeholder if no camera stream is configured.
6. **Interactions**
   - Navigation controls should be clickable and have visible active/hover/focus states.
   - Truck rows should be selectable.
   - Cargo slots should show hover/focus/selected states.
   - Filters, notification button, search, and add-vehicle action should have meaningful UI behavior (a small popover/modal or local state is acceptable).
   - Do not pretend that live GPS, camera, phone calls, or real fleet APIs are connected if they are not. Clearly use mock/demo data.

## Engineering requirements
- Follow the existing architecture and component patterns.
- Keep components focused and reusable. Suggested boundaries:
  - `DashboardHeader`
  - `KpiStrip`
  - `VehicleSummary`
  - `CargoLayout`
  - `TruckList`
  - `RouteMapCard`
  - `VehicleMetrics`
  - `MechanicalHealth`
  - `CameraPreview`
- Keep mock data separate from presentation components.
- Prefer semantic HTML and accessible labels.
- All interactive elements must be keyboard accessible and have visible focus styles.
- Use the project's existing icon library. If none exists, use simple inline SVGs or install no new dependency unless necessary.
- Avoid emoji as core interface icons.
- Use CSS variables/design tokens for colors, spacing, radii, shadows, and typography when consistent with the current stack.
- Ensure responsive layouts:
  - Desktop: full dashboard with main visualization and truck list side-by-side.
  - Tablet: allow columns to wrap and cards to reflow.
  - Mobile: stack sections, keep key metrics readable, and make truck list independently scrollable only when appropriate.
- Avoid horizontal page overflow at common widths.
- Do not hard-code every component to the screenshot's exact pixel dimensions; reproduce its hierarchy and visual character.
- Do not use lorem ipsum. Use realistic logistics sample data.
- Do not expose secrets or commit environment files.

## Suggested demo data
- Active vehicles: 56
- Vehicles in maintenance: 8
- Average efficiency: 87%
- Cargo in transit: 128
- Selected vehicle: TR-001, MAN TGX, Active
- Route: Burden
- Payload: 5,000 / 10,000 kg
- Used volume: 23 / 45 m³
- Used capacity: 50%
- Fuel: 60%
- Temperature: 24°C
- Daily active time: 8h 40m / 10h
- Average speed: 60–80 km/h
- Mechanical condition: 91%
- Sample truck capacities: 50%, 82%, 77%, 77%, 79%, 75%, 92%

## Definition of done
- The page resembles the reference in hierarchy, palette, density, rounded cards, and fleet-monitoring content.
- No broken assets, console errors, or obvious layout overflow.
- Loading, empty, and interaction states are handled where relevant.
- Responsive layout works at desktop, tablet, and mobile widths.
- Existing app behavior has not been broken.
- Lint/type-check/build pass where scripts are available.
- Provide a concise summary of files changed and commands/tests run.
