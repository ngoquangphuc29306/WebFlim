# PHASE 06 — SEARCH, GENRE, COUNTRY, YEAR, FILTERS & PAGINATION

Read `docs/MASTER_SPEC.md` first.

Your task is ONLY search/discovery.

Reuse existing:
- API client/types
- MovieCard
- MovieGrid
- Pagination
- design system

## GOAL

Users should be able to discover movies quickly using real VSMov search/filter endpoints.

## SEARCH ROUTE

```text
/tim-kiem?q=keyword
```

Use the real VSMov search API.

Current docs show an example:

```text
GET /api/tim-kiem?keyword=avengers&limit=5
```

Verify real supported parameters before implementation.

## SEARCH UX

Header search:
- icon/button
- desktop may expand into input
- Enter navigates to full results page
- Escape closes if using expanded interaction

Full results page:
```text
Kết quả tìm kiếm cho “...”
```

States:
- empty query
- loading
- results
- no results
- error

Do not search on every keystroke without control.

If live suggestions are implemented:
- debounce approximately 300–500ms
- cancel/ignore stale results
- keep suggestions lightweight
- do not duplicate a massive full-results fetch

## SEARCH URL

Important search term must exist in URL.

Refreshing or sharing the page must preserve the query.

## DISCOVERY ROUTES

Implement/refine:

```text
/the-loai/[slug]
/quoc-gia/[slug]
/nam/[year]
/danh-sach/[slug]
```

Only create routes/filters supported by real API data.

## FILTERS

Possible controls:
- genre
- country
- year
- sorting

Only include parameters VSMov actually supports.

Do not create a beautiful dropdown that does nothing.

Important filters should update URL search params.

Example concept:

```text
/the-loai/hanh-dong?year=2025&page=2
```

Adapt to actual API.

## PAGINATION

Use API pagination rather than loading all pages.

Desktop:
```text
← 1 2 3 4 5 … 20 →
```

Mobile:
```text
← Trang trước      Trang sau →
```

Preserve current filters/search when changing page.

Scroll to useful content position after page navigation if necessary.

## MOVIE GRID

Desktop:
- typically 5–7 cards based on viewport

Tablet:
- 3–5

Mobile:
- 2–3

Do not force fixed counts if responsive CSS can handle them naturally.

## FILTER MOBILE UX

Desktop filters may be inline.

Mobile:
- compact filter trigger
- sheet/drawer if existing UI supports it
- clear Apply/Reset behavior
- do not hide essential search state

## EMPTY STATES

Examples:

```text
Không tìm thấy phim phù hợp với “...”
```

or

```text
Chưa có phim phù hợp với bộ lọc này.
```

Offer a sensible reset action where relevant.

## SEO / INDEXING

Category/country/year pages may have indexable metadata if appropriate.

Search results typically need careful metadata and should not produce spammy SEO output.

Do not keyword stuff.

## PERFORMANCE

- server render first page where practical
- avoid unnecessary client-side refetches
- reuse cache strategy
- avoid loading every genre/country dataset repeatedly if it can be shared/cached

## NON-GOALS

- no personalized recommendation engine
- no Elasticsearch backend
- no database
- no fake filters
- no Android TV search
- no homepage redesign

## COMPLETION CHECKLIST

- [ ] Real search works
- [ ] Query persisted in URL
- [ ] Search states implemented
- [ ] Genre route works
- [ ] Country route works
- [ ] Year route works if API supports it
- [ ] List route works
- [ ] Filters use real params only
- [ ] Pagination preserves state
- [ ] Responsive grids
- [ ] Mobile filters usable
- [ ] Error/empty states
- [ ] No mock data


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
1. search endpoint/params
2. supported filters implemented
3. pagination model
4. URL formats
5. files changed
6. checks run

Do not start Phase 07.
