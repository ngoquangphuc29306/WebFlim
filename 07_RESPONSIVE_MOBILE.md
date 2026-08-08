# PHASE 07 — RESPONSIVE, MOBILE & TABLET REFINEMENT

Read `docs/MASTER_SPEC.md` first.

This phase is a UI refinement pass.

Do NOT add unrelated features.

## GOAL

Make the complete web experience intentional and polished across phone, tablet, laptop, desktop, and large desktop.

Test at minimum:

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

## AUDIT FIRST

Before changing styles, inspect:

- Header
- Home hero
- Movie rails
- Movie cards
- Movie grids
- Detail page
- Metadata
- Cast
- Episodes
- Watch player
- Server selector
- Search
- Filters
- Pagination
- Footer
- loading/error states

Create a mental/temporary issue list before patching.

## MOBILE PRINCIPLES

Do NOT make mobile a scaled desktop.

Mobile should have:
- compact navigation
- readable hero
- usable touch targets
- horizontal movie rails
- efficient poster density
- simple player controls
- clear episode navigation
- no hover-only actions

## HEADER

Mobile:
```text
Logo                         Search  Menu
```

Requirements:
- menu reachable by keyboard/touch
- no nav text overflow
- correct sticky behavior
- avoid taking excessive vertical space

## HERO

Mobile:
- intentional crop/focal area
- roughly 55–70vh only if visually appropriate
- readable title
- compact metadata
- CTA not hidden below fold
- description may be shorter/clamped

Tablet:
- intermediate content width
- do not simply use desktop values

## MOVIE RAILS

Mobile:
- touch scroll
- card width approximately 120–150px where appropriate
- snap behavior optional, only if it improves UX
- no accidental page horizontal overflow

Desktop:
- smooth rail
- arrows correctly disabled at boundaries
- no clipping of focus rings

## GRIDS

Ensure:
- cards do not become too narrow
- gaps remain consistent
- poster aspect ratios stable
- title wrapping/truncation predictable

## DETAIL PAGE

Mobile:
- backdrop then poster/info
- CTA accessible
- metadata wraps
- cast horizontal scroll
- episode buttons easy to tap

Tablet:
- decide when layout changes from stacked to split based on actual content

## PLAYER PAGE

Mobile:
```text
width: 100%
aspect-ratio: 16/9
```

Check:
- iframe/player not overflowing
- selectors not too tiny
- episode grid not overly dense
- prev/next actions fit

## FILTERS

Mobile:
- use appropriate sheet/drawer/dropdown
- selected filters visible
- reset possible
- controls at least ~44px where practical

## TYPOGRAPHY

Audit:
- hero title
- section title
- card title
- metadata
- body text
- buttons

Avoid:
- 10px unreadable labels
- desktop 72px heading on a 360px phone
- long unbroken movie titles destroying layout

## SAFE AREAS

Where relevant, consider:
- mobile browser bottom bars
- notches/safe area
- fullscreen/player transitions

Do not overengineer unsupported environments.

## ACCESSIBILITY

Touch and keyboard:
- focus rings visible
- focus not clipped
- controls have accessible names
- tap targets not cramped
- contrast still acceptable on overlays

## MOTION

Disable/reduce transform-heavy interaction for touch where hover has no meaning.

Support reduced motion.

## OVERFLOW AUDIT

There must be no unintended horizontal body scrolling.

Common sources:
- fixed widths
- long titles
- player iframe
- episode grids
- rail controls
- dropdowns
- negative margins

Fix root causes rather than globally hiding all overflow if that breaks content.

## NON-GOALS

- no Android TV
- no major visual redesign
- no API rewrite
- no new backend
- no new feature set

## COMPLETION CHECKLIST

- [ ] 360px usable
- [ ] 390px usable
- [ ] 430px usable
- [ ] 768px intentional tablet layout
- [ ] 1024px good
- [ ] 1280/1440 good
- [ ] 1920 doesn't over-scale cards
- [ ] no unintended horizontal body overflow
- [ ] touch targets good
- [ ] hero responsive
- [ ] player responsive
- [ ] filters responsive
- [ ] detail responsive
- [ ] rails responsive
- [ ] typography responsive


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


At the end provide:
1. responsive issues found
2. fixes applied
3. any intentional breakpoint decisions
4. remaining limitations
5. checks run

Do not start Phase 08.
