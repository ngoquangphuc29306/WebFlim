# PHASE 02 — STREAMING DESIGN SYSTEM & SHARED UI FOUNDATION

Read `docs/MASTER_SPEC.md` first.

Your task is ONLY Phase 02.

Assume the VSMov/API foundation from Phase 01 already exists. Reuse it.

## GOAL

Create a coherent premium streaming visual system and reusable UI primitives without prematurely building every feature page.

The visual direction is Netflix-inspired in usability and cinematic density, but must have an original identity.

## DESIGN PRINCIPLES

The UI must feel:

- dark and cinematic
- premium
- restrained
- content-first
- highly legible
- polished
- responsive
- not like a SaaS dashboard
- not like a generic AI landing page

Movie artwork should remain the visual focus.

## COLOR SYSTEM

Create reusable theme variables/tokens.

Suggested direction:

```text
background-primary   #080808
background-secondary #101010
surface               #141414
surface-hover         #1A1A1A
text-primary          #F5F5F5
text-secondary        #A3A3A3
text-muted            #737373
```

Choose ONE restrained brand accent.

Do not copy Netflix logos or brand assets.

Use semantic variables rather than hardcoding colors in dozens of components.

## TYPOGRAPHY

Establish:
- display/hero
- page title
- section title
- card title
- body
- metadata
- label

Use an existing high-quality sans font if already configured.

Avoid microscopic metadata.

## SPACING & LAYOUT

Create consistent layout rules:

```text
mobile: 16px horizontal
tablet: 24–32px
desktop: 48–64px
large screen: bounded but wide
```

Movie content should not be squeezed into a narrow SaaS container.

## RADIUS

Use restrained radius:
- poster/card: ~6–10px
- buttons: ~6–10px
- dialogs/sheets as appropriate

Do not make every component a rounded pill.

## SHARED COMPONENTS

Build/refine only reusable foundation components needed by future phases:

### Header
Desktop:
```text
Brand | Home | Series | Movies | Genre | Country          Search | My List
```

Behavior:
- transparent/dark-over-hero state
- near-black scrolled state
- subtle transition
- sticky/fixed as appropriate
- accessible navigation

Mobile:
```text
Brand                              Search  Menu
```

Use a sheet/menu pattern only if consistent with the project.

### PrimaryButton / SecondaryButton
Primary movie CTA:
```text
Play icon + Xem ngay
```

Secondary:
```text
Info icon + Chi tiết
```

Use Lucide or existing icon system.

### MovieCard
2:3 poster.
Support optional:
- title
- year
- episode
- quality
- language

Card states:
- default
- hover
- keyboard focus
- loading
- broken image

Desktop:
- subtle scale ~1.04
- no layout shift

### MovieBadge
Small, readable, unobtrusive.

### MovieRow shell
Provide title/action/scroll container structure.
Do not yet create dozens of homepage rows.

### MovieGrid
Responsive grid primitive.

### Skeletons
Create visually stable:
- MovieCardSkeleton
- MovieRowSkeleton
- HeroSkeleton if useful

### EmptyState / ErrorState
Reusable, concise, not playful.

### Footer
Minimal streaming footer.

## IMAGE COMPONENT

Create or refine a movie artwork component that:
- uses `next/image`
- preserves aspect ratio
- handles missing URLs
- has a local tasteful fallback
- never displays a browser broken-image icon

## ACCESSIBILITY

Every interactive primitive must have:
- focus-visible state
- keyboard operability
- semantic element
- accessible icon labels

## MOTION

Allowed:
- subtle opacity
- subtle transform
- 150–300ms

Respect `prefers-reduced-motion`.

## RESPONSIVENESS

Foundation components must already work at:

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

Do not fully polish Phase 07 concerns yet, but do not introduce structural responsive debt.

## DO NOT

- do not build the final homepage in this phase
- do not build player
- do not redesign API architecture
- do not introduce fake movies
- do not add giant gradient marketing copy
- do not add glassmorphism everywhere
- do not use emoji as UI icons
- do not create unnecessary dependencies

## COMPLETION CHECKLIST

- [ ] Theme/tokens established
- [ ] Typography hierarchy established
- [ ] Header works desktop/mobile
- [ ] MovieCard reusable and accessible
- [ ] Movie badges reusable
- [ ] Grid/row primitives exist
- [ ] Skeletons exist
- [ ] Empty/error states exist
- [ ] Image fallback works
- [ ] Footer exists
- [ ] No visual regression in existing routes
- [ ] No API rewrite


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


At the end report:
1. design tokens chosen
2. reusable components added/changed
3. responsive decisions
4. accessibility decisions
5. checks run

Do not start Phase 03.
