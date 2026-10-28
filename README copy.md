# Logistics UI Agent Files

These files give coding agents project-specific instructions for implementing the React logistics dashboard shown in the supplied references.

## Included
- `AGENTS.md` — main project specification for compatible coding agents.
- `.cursor/rules/logistics-dashboard.mdc` — Cursor project rule.
- `.github/copilot-instructions.md` — GitHub Copilot repository instructions.
- `.claude/agents/logistics-ui-builder.md` — Claude Code subagent definition.

## Install
1. Download and unzip this bundle.
2. Copy the included files/folders into the **root of your existing React project**. Merge folders if they already exist; do not overwrite existing instructions without reviewing them.
3. Open the project in your coding agent.
4. Prompt it with:

   > Read `AGENTS.md` and inspect the existing project. Implement the logistics fleet dashboard to match the supplied reference screenshots. Reuse the current stack and components, make the dashboard responsive and interactive with realistic mock data, and run the available checks. Do not rewrite unrelated code.

## Notes
These are instruction files, not the finished dashboard implementation. The coding agent will use them to build the theme inside your actual project. Keep the screenshots available to the agent as visual references when possible.
