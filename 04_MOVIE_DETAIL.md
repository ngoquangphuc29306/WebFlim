# PHASE 04 — MOVIE DETAIL PAGE

Read `docs/MASTER_SPEC.md` first.

Your task is ONLY the movie detail experience.

Route:

```text
/phim/[slug]
```

Reuse all existing:
- API services
- normalized models
- design tokens
- MovieCard/MovieRow
- Header/Footer
- loading/error components

## GOAL

When a user opens a movie, they should immediately understand:
- title
- what it is
- story
- year
- movie vs series
- country/genre
- episode/status information
- cast/director if available
- how to start watching

## DATA

Use the real VSMov detail endpoint.

Current docs indicate detail data may contain:
- movie information
- HD artwork
- cast/director
- episodes/server data

Do not assume exact field names without inspecting the response/types already created.

## HERO/BACKDROP

Create a cinematic backdrop area:
- real artwork
- dark readability overlay
- blends into page background
- no huge empty marketing headline

Desktop:
```text
Backdrop
Poster | Information
```

Mobile:
```text
Backdrop
Poster
Information
```

## PRIMARY INFO

Display only available meaningful fields, such as:
- local title
- original title
- year
- status
- episode
- total episodes
- duration
- quality
- language
- country
- genres
- description
- rating only if real
- director
- cast

Do not render:
```text
undefined
null
N/A
[]
```

Hide missing metadata.

## WATCH CTA

Primary action:

```text
▶ Xem ngay
```

Behavior:
- for single movie: route to watch experience using first valid source/episode policy
- for series: either first available episode or clearly selected episode
- do not create a fake source

Secondary optional:
```text
+ Danh sách của tôi
```
only if local watchlist already exists or is intentionally included.

## DESCRIPTION

- readable line length
- preserve meaningful text
- support long descriptions without dominating page
- optional expand/collapse if truly needed

## GENRES/COUNTRIES

Render using links to real discovery routes if those routes exist.

Do not create dead links.

## CAST/DIRECTOR

If API provides cast:
- show an elegant horizontal/compact section
- use real portrait URL only when present
- otherwise use neutral placeholder
- never invent actor images

## EPISODE PREVIEW/SELECTOR

If series/detail includes episodes:
- display useful episode selector
- show server grouping if necessary
- active/available states
- handle many episodes without producing a giant uncontrolled page

Possible patterns:
- grouped episodes
- scrollable section
- compact grid
- pagination/grouping for very large series

Clicking an episode should route to the watch page with enough URL state to select the intended episode/server.

## RELATED MOVIES

Only add related content if:
- a real appropriate API query can produce it
- it does not require fake recommendations

A simple same-genre rail is acceptable if supported and clearly treated as related discovery rather than personalized recommendation.

## SEO

Implement/refine `generateMetadata`.

Use actual movie information for:
- title
- description
- Open Graph image

Avoid keyword stuffing.

## NOT FOUND

Invalid slug:
- return proper 404/not-found behavior where possible
- do not show a generic blank page

## LOADING / ERROR

Use visually coherent:
- detail skeleton
- retry/error state
- fallback image

## RESPONSIVE

Inspect:
- poster size
- metadata wrapping
- backdrop crop
- CTA stacking
- episode hit targets
- cast overflow

## NON-GOALS

Do NOT:
- build the complete player implementation
- redesign homepage
- rewrite API client
- add authentication
- add fake ratings/cast
- implement Android TV

## COMPLETION CHECKLIST

- [ ] Real detail endpoint
- [ ] Cinematic detail header
- [ ] Correct metadata
- [ ] Missing fields hidden
- [ ] Watch CTA works
- [ ] Episode data represented
- [ ] Cast/director represented if real
- [ ] Related section only if supported
- [ ] Metadata/SEO
- [ ] 404
- [ ] loading/error
- [ ] responsive
- [ ] accessible focus/actions


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
1. detail fields actually used
2. episode/server mapping
3. route behavior for Watch
4. files changed
5. checks run

Do not start Phase 05.
