# PHASE 09 — FULL PROJECT QA, REGRESSION & RELEASE READINESS

Read `docs/MASTER_SPEC.md` first.

Your task is to audit the existing web product end-to-end.

Do not add new product features.

Do not redesign the interface.

## GOAL

Find and fix real defects before considering the web version complete.

## TEST MATRIX

### Home
- loads real data
- hero renders
- hero CTA works
- rows render
- card links work
- empty/failure behavior acceptable

### Navigation
- desktop nav
- mobile menu
- browser back/forward
- active/hover/focus states
- no dead links

### Search
- empty query
- normal query
- no-result query
- special characters
- pagination
- refresh/share URL
- mobile search

### Discovery
- genre
- country
- year
- list
- filters
- pagination
- invalid slug/filter

### Movie Detail
- valid movie
- missing image
- missing metadata
- long title
- long description
- series
- single movie
- no episodes
- many episodes
- cast absent/present
- 404

### Watch
- valid source
- invalid source
- server switch
- episode switch
- previous/next
- direct URL refresh
- malformed episode/server params
- no playable source
- mobile 16:9

### Responsive
Test at:
```text
360
390
430
768
1024
1280
1440
1920
```

Check:
- no horizontal body overflow
- no clipped focus
- no unreadable text
- no inaccessible buttons
- card rails usable
- player usable

### Keyboard
Navigate without mouse:
- header
- movie rows
- cards
- search
- filters
- detail
- episodes
- servers
- pagination

### Loading
- skeletons preserve dimensions
- no blank page
- no severe flicker

### Error
Simulate or reason through:
- API unavailable
- 404
- malformed data
- broken artwork
- playback failure

## CODE QUALITY AUDIT

Search for:
```text
any
@ts-ignore
TODO
FIXME
console.log
hardcoded mock movie data
duplicate API URLs
raw fetch calls inside presentation components
dead components
unused imports
```

Not every TODO must be removed, but release-blocking ones must be addressed.

## ARCHITECTURE REGRESSION

Verify:
- central API layer still used
- routes remain consistent
- components remain reusable
- design tokens not fragmented
- no feature introduced duplicate parallel architecture

## QUALITY COMMANDS

Run all commands available in the project, typically:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If a script does not exist, do not invent its success. State that it is unavailable.

Fix errors caused by the current codebase where safe.

Do not suppress errors merely to get green output.

## BROWSER CONSOLE

Check for:
- hydration errors
- failed image configuration
- React key warnings
- invalid DOM nesting
- repeated network storms
- navigation exceptions

## PERFORMANCE SANITY

Check:
- homepage doesn't fetch hundreds of unnecessary items
- images lazy load
- search debounce works if implemented
- client JS isn't obviously excessive
- player isn't mounted on pages where unused

## RELEASE REPORT

Create/update:

```text
docs/QA_REPORT.md
```

Include:
- test scope
- bugs found
- bugs fixed
- known limitations
- commands/results
- release blockers
- recommendation: READY / READY WITH KNOWN LIMITATIONS / NOT READY

Do not falsely mark READY if blocking defects remain.

## NON-GOALS

- no Android TV
- no new authentication
- no redesign
- no new recommendation algorithm
- no speculative refactor


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


At the end provide a concise release summary.

Do not start Phase 10 automatically.
