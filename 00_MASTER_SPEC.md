# MASTER SPEC — MODERN MOVIE STREAMING WEBSITE

You are a Senior Software Engineer, Senior Full-Stack Engineer, Senior Front-End Engineer, Software Architect, Product Designer, UI/UX Designer, and Prompt-aware coding agent.

Your goal is to build a production-quality modern movie streaming website using the official VSMov API.

Official documentation:

```text
https://vsmov.com/api-document
```

Base API:

```text
https://vsmov.com/api
```

According to the current VSMov documentation:
- public endpoints use `/api`
- responses are JSON
- endpoints are GET-based
- no API token is required
- the API provides movie lists, filtering, search, genres, countries, release years, movie details, cast, and episode/server data where available
- real detail responses may contain fields such as `name`, `slug`, `thumb_url`, `poster_url`, and `episodes`

Never treat the summary above as a replacement for inspecting the current official docs and real responses.

---

## 1. PRODUCT VISION

Build a premium, cinematic, content-first streaming experience inspired by the UX quality of Netflix, Apple TV+, Disney+, HBO/Max, and Prime Video.

Do NOT clone any product pixel-for-pixel.

The product should feel:

- cinematic
- dark
- premium
- modern
- calm
- fast
- immersive
- polished
- professional
- responsive
- content-first

Avoid the generic AI-generated SaaS look.

Do not use:
- dashboard-style statistic cards
- neon glow everywhere
- excessive glassmorphism
- giant pill controls everywhere
- decorative gradients as the main visual identity
- cartoon artwork
- random accent colors
- oversized empty hero copy
- excessive motion

Movie artwork should provide most of the visual richness.

---

## 2. DEFAULT TECH STACK

Unless the existing project already uses a compatible alternative, prefer:

```text
Next.js 15+
App Router
React
TypeScript strict
Tailwind CSS
shadcn/ui where appropriate
Lucide icons
```

Use:
- Server Components by default
- Client Components only where interaction requires them
- `next/image`
- `next/link`
- route-level loading/error handling
- typed data models

Do not add state-management libraries unless actually needed.

---

## 3. TARGET ROUTES

Recommended route model:

```text
/
 /phim/[slug]
 /xem-phim/[slug]
 /tim-kiem
 /the-loai/[slug]
 /quoc-gia/[slug]
 /nam/[year]
 /danh-sach/[slug]
```

Use URL query parameters for:
- search terms
- page numbers
- filters
- episode/server selection where appropriate

Important state should be shareable/bookmarkable when possible.

---

## 4. ARCHITECTURE PRINCIPLE

External API responses must not leak everywhere through the UI.

Preferred flow:

```text
Page / Feature
   ↓
Service / query function
   ↓
Normalizer / mapper
   ↓
VSMov API client
   ↓
VSMov
```

Recommended concepts:

```text
src/
├── app/
├── components/
│   ├── layout/
│   ├── movie/
│   ├── player/
│   ├── navigation/
│   └── ui/
├── features/
│   ├── home/
│   ├── movies/
│   ├── search/
│   └── player/
├── lib/
│   ├── api/
│   │   ├── vsmov.ts
│   │   ├── endpoints.ts
│   │   ├── types.ts
│   │   └── normalizers.ts
│   └── utils/
└── types/
```

Do not force this exact tree if a clean architecture already exists.

---

## 5. VSMOV INTEGRATION RULES

Before implementing an endpoint:

1. inspect official docs
2. inspect at least one real response
3. determine required/optional fields
4. determine pagination shape
5. determine image URL behavior
6. determine empty/error behavior
7. type the response
8. normalize it for UI use

Never invent:
- endpoints
- query parameters
- movie IDs
- ratings
- streaming links
- episode structures
- cast data

Real API response wins over prompt assumptions.

---

## 6. UI DOMAIN MODEL

Prefer stable UI-facing data types instead of binding every component to raw API fields.

Example concept:

```ts
export interface MovieCardModel {
  id?: string | number;
  slug: string;
  title: string;
  originalTitle?: string;
  posterUrl: string;
  thumbUrl?: string;
  year?: string | number;
  episodeLabel?: string;
  quality?: string;
  language?: string;
}
```

This is only a model example.

Map actual API data carefully.

Missing data must remain optional rather than being fabricated.

---

## 7. DESIGN SYSTEM

Base direction:

```text
Background: #080808
Surface:    #101010 / #141414 / #181818
Text:       #F5F5F5
Secondary:  #A3A3A3
Muted:      #737373
Accent:     one restrained brand color
```

A red-family accent is acceptable, but do not copy Netflix branding.

Typography:
- Geist or Inter if already available
- clear hierarchy
- strong hero typography
- readable TV/movie metadata
- no tiny low-contrast labels

Radius:
- restrained, typically 6–10px
- avoid excessive 24px+ rounded UI

Motion:
- 150–300ms
- opacity/scale/translate only where useful
- support `prefers-reduced-motion`

Spacing:
- consistent tokenized scale
- 16px mobile page padding
- 24–32px tablet
- 48–64px desktop as appropriate

---

## 8. CORE COMPONENTS

Prefer reusable components such as:

```text
Header
MobileNav
HeroBanner
MovieCard
MovieRow
MovieGrid
MovieBadge
MoviePoster
MovieBackdrop
MovieMetadata
MovieDetails
CastList
EpisodeSelector
ServerSelector
VideoPlayer
Pagination
SearchInput
Skeletons
EmptyState
ErrorState
Footer
```

Avoid 800–1500 line page components.

---

## 9. HOME EXPERIENCE

The homepage should prioritize immediate browsing.

Recommended order:

```text
Header
Hero
Recently updated
Popular / highlighted collection if real data exists
Series
Single movies
Genre rails
Footer
```

Only render sections backed by real data.

Movie rows:
- horizontal desktop rails
- touch-friendly horizontal scroll on mobile
- subtle desktop arrows
- no ugly permanent scrollbar

---

## 10. MOVIE CARD

Primary ratio: roughly 2:3 poster.

Card may display:
- title
- year
- episode
- quality
- language

Do not overload cards.

Desktop focus/hover:
- ~1.03–1.06 scale
- 180–250ms transition
- no layout shift

Mobile:
- no hover dependency
- clear tap target

---

## 11. DETAIL PAGE

Route:

```text
/phim/[slug]
```

Should answer immediately:
- what is this movie?
- what is it about?
- what year?
- movie or series?
- genre/country?
- status/episodes?
- rating if actually available?
- how can I watch?

Recommended structure:

```text
Backdrop
Poster + primary info
Watch CTA
Description
Metadata
Cast/director
Episode section
Related content
```

Hide absent fields instead of rendering `undefined`, `null`, or meaningless `N/A`.

---

## 12. WATCH PAGE

Route:

```text
/xem-phim/[slug]
```

Player is the primary visual element.

Recommended structure:

```text
Player
Title + episode
Server selector
Episode navigation
Previous / Next
Supporting movie information
Related content
```

Use only playback URLs actually returned by the API.

Do not fabricate or scrape additional video sources.

---

## 13. SEARCH & DISCOVERY

Search route concept:

```text
/tim-kiem?q=...
```

Implement:
- debounced suggestions only if useful
- URL-backed full search
- loading
- empty
- error
- pagination

Discovery:
- genre
- country
- year
- list
- API-supported filtering/sorting only

---

## 14. RESPONSIVE TARGETS

Explicitly inspect:

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

Do not merely shrink desktop.

Mobile:
- compact header
- intentional hero crop
- horizontal rails
- 2–3 column grids where appropriate
- 44px-ish interaction targets
- no body overflow

Large screens:
- show more cards rather than making posters enormous

---

## 15. PERFORMANCE

Prioritize:
- Server Components
- image sizing
- lazy loading
- minimal client JS
- request deduplication
- cache/revalidate policy
- skeleton dimensions matching final content
- no eager loading of dozens of posters

Configure remote image domains precisely.

---

## 16. SEO

Use:
- `generateMetadata`
- meaningful movie titles/descriptions
- Open Graph where appropriate
- canonical/shareable URLs
- semantic headings

Do not keyword-stuff.

---

## 17. ACCESSIBILITY

Must support:
- keyboard navigation
- visible focus
- semantic buttons/links
- alt text
- heading hierarchy
- sufficient contrast
- accessible icon buttons
- reduced motion preference

---

## 18. OPTIONAL LOCAL FEATURES

Watchlist may initially use localStorage if no auth/backend exists.

Watch history may store:
- movie slug
- episode
- server
- last watched timestamp

Do not fake playback progress if it cannot be measured reliably.

Keep persistence behind a replaceable service abstraction.

---

## 19. IMPLEMENTATION PHASES

Implement in this order:

1. API research & architecture
2. Design system
3. Homepage
4. Movie detail
5. Movie player
6. Search & discovery
7. Responsive/mobile refinement
8. Performance + SEO + accessibility
9. Full QA
10. Android TV only after web is stable

Do not implement future phases unless explicitly instructed.

---

## 20. QUALITY BAR

The result must not feel like:
- a tutorial
- a student demo
- a generic Tailwind landing page
- a dashboard template
- a plain poster grid

It should feel like a coherent modern streaming product.


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


## MASTER RULE

When this master specification conflicts with the real existing codebase or current VSMov API documentation, inspect reality first.

Do not blindly rewrite proven working code to match examples in this document.
