# BONUS — PROJECT CONTEXT SYNC BEFORE A NEW AI SESSION

Use this prompt when starting a fresh Google AI Studio coding session after several phases have already been completed.

Read the entire existing repository before changing code.

Your first job is NOT to implement a feature.

## TASK

Build a concise understanding of the current project state.

Inspect:
- `docs/MASTER_SPEC.md`
- `docs/API_ARCHITECTURE.md` if present
- `docs/QA_REPORT.md` if present
- package.json
- Next.js config
- app routes
- API layer
- types
- normalizers
- shared movie components
- design system/global CSS
- homepage
- detail
- player
- search/discovery
- recent Git diff if available

Then summarize:

1. current architecture
2. current routes
3. VSMov endpoints currently integrated
4. normalized models
5. shared components
6. design tokens
7. completed phases
8. known limitations/TODOs
9. commands available for lint/typecheck/test/build
10. areas that must not be accidentally rewritten

Do not modify code during this context-sync step unless there is a critical compile-blocking issue and I explicitly ask you to fix it.


## GLOBAL CHANGE-SAFETY RULES

Before making any code changes:

1. Inspect the existing project first.
2. Read `docs/MASTER_SPEC.md` if it exists.
3. Understand current routes, components, API services, types, styles, and dependencies.
4. Reuse existing code before creating replacements.
5. Do NOT redesign or rewrite working features unrelated to this task.
6. Do NOT change established routes unless this phase explicitly requires it.
7. Do NOT change the established design system without explicit instruction.
8. Do NOT replace working real API integration with mock data.
9. Do NOT invent VSMov endpoints or response fields.
10. Treat the official VSMov docs and real API responses as the source of truth.
11. Make the smallest coherent set of changes necessary.
12. Preserve all working behavior from previous phases.
13. Do NOT install new packages unless there is a clear technical need.
14. Do NOT use `any` merely to silence TypeScript errors.
15. Do NOT use `@ts-ignore` merely to make the project compile.
16. Keep API/data logic separate from presentation components.
17. Keep server/client boundaries intentional in Next.js App Router.
18. Never expose internal errors, stack traces, or sensitive configuration in the UI.
19. After implementation, run the project's available quality checks.
20. Fix errors introduced by this phase before declaring the phase complete.

If the project differs from assumptions in this prompt, preserve the project's proven working architecture and adapt this task to it rather than performing a destructive rewrite.


Finish by saying which phase/task the repository appears ready for next.
