# PHASE 03 — CINEMATIC HOME PAGE

Read `docs/MASTER_SPEC.md` first.

Your task is ONLY the production-quality homepage.

Reuse:
- Phase 01 API layer
- Phase 02 design system/components

Do not rebuild those foundations.

## GOAL

Create a premium streaming homepage that immediately lets users browse and start watching real VSMov movies.

Route:

```text
/
```

## DATA FIRST

Before implementing sections:
1. inspect the existing VSMov service layer
2. confirm which real list/home endpoints are available
3. use only real API-supported groups
4. do not invent "Top 10", "Trending", or personalized recommendations unless actual data supports them

## PAGE STRUCTURE

Preferred structure:

```text
Header
Hero featured movie
Recently updated
Series
Single movies
Additional real API-backed rails
Genre-backed rails where useful
Footer
```

You may adjust section order based on actual available API data.

Avoid an excessively long homepage.

## HERO

Hero must be cinematic, not a marketing landing section.

Desktop:
- approximately 70–85vh
- use real backdrop/thumb from API
- text aligned toward lower-left/left
- preserve artwork visibility

Content:
- title
- optional original title
- compact metadata
- 2–4 line description
- primary "Xem ngay"
- secondary "Chi tiết"

Use soft directional overlays:
- darker toward left behind text
- bottom fade into page background

Do not cover the image with a heavy opaque gradient.

If a hero data field is absent, hide it.

## HERO SELECTION

Use deterministic logic based on real returned data.

Do not randomly change hero on every render if that creates hydration/cache instability.

If the API does not expose a featured item, select a reasonable item from the returned homepage/list data.

## MOVIE RAIL

Each rail:

```text
Section title                         Xem tất cả >

[poster][poster][poster][poster][poster]...
```

Desktop:
- horizontal rail
- subtle previous/next controls
- controls should not dominate artwork
- keyboard accessible

Mobile:
- native/touch horizontal scrolling
- no tiny arrow buttons required

Do not render a permanent ugly scrollbar.

## MOVIE CARD BEHAVIOR

Reuse the shared MovieCard.

Click:
```text
/phim/{slug}
```

Card metadata:
- only meaningful real fields
- title should truncate elegantly
- badges must not obscure poster excessively

## HOME LOADING

Use route/component skeletons:
- HeroSkeleton
- rows with poster skeletons

Skeleton dimensions should closely match the final content to avoid layout shift.

## HOME ERROR STRATEGY

A single failed rail should not necessarily destroy the entire homepage.

Where architecture allows:
- show available sections
- gracefully omit or display a retry for failed section

Do not expose raw error text.

## EMPTY DATA

If a real section has no movies:
- omit the section or show a compact appropriate empty state
- do not manufacture content

## RESPONSIVE

Check:
- hero crop/position
- text width
- buttons
- row card sizing
- section spacing
- header overlay
- horizontal overflow

Mobile hero:
- roughly 55–70vh depending on actual design
- retain readable CTA
- avoid giant text

## PERFORMANCE

Critical:
- Hero image can be prioritized
- below-the-fold poster images should lazy load
- do not eagerly fetch/render hundreds of cards
- avoid unnecessary client components
- reuse cached server data

## ACCESSIBILITY

- hero CTA keyboard accessible
- rail buttons labeled
- movie cards focusable
- focus visible against dark UI
- headings are semantic
- artwork alt text is meaningful

## NON-GOALS

Do NOT:
- implement full detail page
- implement player
- implement full search
- add login
- add fake personalized history
- rewrite design system
- add Android TV behavior

## COMPLETION CHECKLIST

- [ ] Real VSMov homepage/list data
- [ ] Cinematic hero
- [ ] Working Watch/Detail links
- [ ] Multiple useful real rails
- [ ] Desktop rail controls
- [ ] Mobile swipe/scroll
- [ ] Loading state
- [ ] Error/empty handling
- [ ] Good image loading
- [ ] No layout shift on card hover
- [ ] Responsive 360–1920
- [ ] No mock movie content


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
1. API functions used
2. homepage sections implemented
3. hero selection logic
4. files changed
5. quality checks run

Do not start Phase 04.
