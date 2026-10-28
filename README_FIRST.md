# SK Transworld Logistics — Project Reference Pack

This ZIP is intended to be extracted into the root of the existing React project in VS Code.

## Included folders

- `01_BRD_and_Requirements/`
  - Original BRD DOCX: primary terminology and business requirements.
  - Requirements PDF: supplemental functional and screen details.
  - Combined requirements summary and FE meta-prompt.
- `02_Project_Context/`
  - Canonical master project context in Markdown and DOCX.
- `03_Frontend_Prompts/`
  - Sequential prompts for building and preparing the React frontend for deployment.
- `04_UI_Mockup_References/`
  - Colour palette reference (#3783FF blue, #EFB54A amber, black and white).
  - RoutaX-style truck/cargo dashboard reference.

## How to use in the existing project

1. Extract the ZIP.
2. Copy/merge the contents into the root of your existing project. Do not overwrite existing source code, `package.json`, lockfiles, or README files.
3. Keep the master context Markdown file in the project root as:
   `SK_Transworld_Master_Project_Context.md`
   (or update the instruction prompt to use the actual filename if renamed).
4. Keep the source BRD and PDF in the project folder so the coding agent can inspect them.
5. Keep the UI screenshots in the repository, preferably under `docs/ui-references/` or the included reference folder.
6. Open the project in VS Code Agent mode and run one prompt at a time from the step-by-step prompt pack.

## Instructions for the coding agent

Before each implementation step:
- Read `SK_Transworld_Master_Project_Context.md`.
- Refer to the BRD DOCX for technical/business terminology.
- Refer to the PDF for supplemental workflows, roles, screen requirements, and acceptance details.
- Inspect the existing React repository before editing.
- Use the screenshots as visual direction only; do not copy RoutaX branding.
- Preserve the existing architecture and working features.
- Implement only the current step, run available checks, report actual results, and wait for approval before moving on.

## Important notes

- This is a requirements and visual-reference pack, not a completed React application.
- External services such as GPS, carrier tracking, customs lodgement, LHDN MyInvois, bank feeds, email delivery, and camera feeds must be marked as demo/unconfigured unless a real integration is verified.
- Unresolved business policies must remain marked `Pending Business Clarification`.
- Do not deploy or create cloud resources without explicit approval.
