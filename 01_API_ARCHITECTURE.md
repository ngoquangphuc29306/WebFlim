# PHASE 01 — VSMOV API RESEARCH & APPLICATION ARCHITECTURE

Read `docs/MASTER_SPEC.md` first.

Your task is ONLY Phase 01.

Do not build the final homepage, player, search UI, or detailed visual polish yet.

## GOAL

Establish a trustworthy technical foundation around the real VSMov API before feature development.

Official docs:

```text
https://vsmov.com/api-document
```

Base:

```text
https://vsmov.com/api
```

The current documentation states public endpoints use `/api`, return JSON, require no token, and includes APIs for lists/filtering, search, genres, countries, release years, movie detail, cast, and episode/server data when present.

## TASK A — INSPECT THE API

Inspect the current docs and actual responses for at least:

1. newest/home list
2. search
3. movie detail
4. a movie detail containing episode/server data
5. genre list
6. country list
7. year list
8. one filtered listing endpoint

Current docs include examples such as:

```text
GET /api/danh-sach/phim-moi-cap-nhat?page=1
GET /api/tim-kiem?keyword=avengers&limit=5
GET /api/phim/{slug}
```

Do not assume these are the only endpoints.

For each relevant response identify:

- response envelope
- movie item fields
- pagination fields
- image fields
- detail-only fields
- episode/server shape
- playback link fields
- null/optional values
- filter parameters
- error shape if observable

## TASK B — CREATE API TYPES

Create strict TypeScript types based on reality.

Separate, when useful:

```text
raw VSMov API types
normalized frontend types
```

Do not use `any`.

Do not pretend optional data is required.

## TASK C — API CLIENT

Create a centralized client/service layer.

Desired qualities:

- configurable base URL
- reusable fetch helper
- typed responses
- status validation
- useful server-side errors
- safe UI-facing failure handling
- cache/revalidate configuration where appropriate
- no raw fetch scattered through presentation components

Possible functions, ONLY if supported:

```text
getNewestMovies
searchMovies
getMovieDetail
getGenres
getMoviesByGenre
getCountries
getMoviesByCountry
getYears
getMoviesByYear
getMovieList
```

Name functions according to the actual project conventions.

## TASK D — NORMALIZATION

Create mapper/normalizer functions so components can consume predictable models.

Examples:

```text
normalizeMovieCard
normalizeMovieDetail
normalizeEpisodeServers
```

Do not invent missing values.

Use local fallback artwork only for display failure.

## TASK E — ERROR MODEL

Define how the frontend distinguishes:

```text
network failure
HTTP failure
empty response
not found
invalid/malformed response
```

The UI should eventually be able to render clean states without parsing raw exceptions.

## TASK F — IMAGE HANDLING ANALYSIS

Determine:
- whether image URLs are absolute or relative
- which hosts are used
- whether `poster_url` and `thumb_url` are consistently populated
- what Next.js `remotePatterns` are needed

Configure only required hosts.

## TASK G — ARCHITECTURE DOCUMENTATION

Create/update a concise technical document, for example:

```text
docs/API_ARCHITECTURE.md
```

Document:

- API base
- endpoints actually used
- response conventions
- normalization
- cache strategy
- error strategy
- image handling
- important limitations

## NON-GOALS

Do NOT:
- redesign the site
- build every page
- implement complex carousels
- implement player UI
- create fake movie data
- add authentication
- add database tables
- scrape unlisted streaming sources

## COMPLETION CHECKLIST

- [ ] Real API inspected
- [ ] API types created
- [ ] Central client created
- [ ] Normalizers created where useful
- [ ] Errors handled intentionally
- [ ] Image hosts understood/configured
- [ ] No fake endpoints
- [ ] No `any` shortcuts
- [ ] Architecture documented
- [ ] Existing app still builds


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


At the end, report:
1. files changed
2. endpoints verified
3. important response-field findings
4. technical risks/limitations
5. checks run and their result

Do not start Phase 02.
