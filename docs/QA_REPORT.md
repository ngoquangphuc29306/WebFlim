# QA & RELEASE READINESS REPORT

> WEB-F6 final verification supersedes the historical checkpoint below. The historical findings are retained for traceability; current release evidence is recorded in the final section.

## 1. Test Scope & Matrix Coverage

- **Routes Audited & Verified:**
  - `/` (Home page with hero showcase, trending/newest/movie/series rails)
  - `/phim/[slug]` (Movie detail page, backdrop, poster, metadata, cast, episode list, related movies)
  - `/xem-phim/[slug]` (Watch page, 16:9 player container, server selector, episode grid, previous/next controls, local watch history)
  - `/tim-kiem` (Search results with URL parameters `?keyword=...`, dynamic loading, empty/no-results states, `robots: { index: false }`)
  - `/the-loai/[slug]` (Genre listing with pagination & dynamic metadata)
  - `/quoc-gia/[slug]` (Country listing with pagination & dynamic metadata)
  - `/nam/[year]` (Release year listing with pagination & dynamic metadata)
  - `/danh-sach/[slug]` (Category list e.g. `phim-moi`, `phim-bo`, `phim-le`, `hoat-hinh`)
  - `/yeu-thich` & `/lich-su` (Bookmarks & local watch history management)

- **Components & Layouts Tested:**
  - Header with search drawer & responsive mobile menu navigation drawer
  - Hero Section with responsive image, line-clamped description, and action buttons
  - MovieCard & MovieGrid with clean responsive breakpoints (2-3 columns on mobile, 3-4 on tablet, 5-7 on desktop)
  - VideoPlayer component with Theater mode toggle, server reload action, and fallback error recovery UI
  - EpisodeSelector with chunking (50 episodes per group) for large series
  - Footer with copyright & links

## 2. Defects Identified & Fixed

- **Fix 1: Dynamic Route Server Prerendering Strategy**
  - *Issue:* Static page pre-rendering at build time failed for search and dynamic routes due to server component expectation of missing dynamic params.
  - *Fix:* Configured `export const dynamic = 'force-dynamic'` across `/phim/[slug]`, `/xem-phim/[slug]`, `/the-loai/[slug]`, `/quoc-gia/[slug]`, `/danh-sach/[slug]`, `/nam/[year]`, and `/tim-kiem`.

- **Fix 2: Keyboard Theater Mode Exit**
  - *Issue:* Theater mode needed Escape key accessibility handling.
  - *Fix:* Added `useEffect` keydown event listener in `VideoPlayer.tsx` to toggle off theater mode on `Escape`.

- **Fix 3: Mobile Viewport & Safe Insets**
  - *Issue:* Unintended overflow potential on mobile viewports with notch/home bar safe areas.
  - *Fix:* Applied CSS safe area env insets (`safe-area-inset-*`) and `overflow-x: hidden` in `globals.css`.

- **Fix 4: Large Series Episode Chunking**
  - *Issue:* Series with hundreds of episodes generated long un-paginated UI lists.
  - *Fix:* Added episode range chunking (1-50, 51-100) in `EpisodeSelector.tsx`.

## 3. Known Limitations & Non-Blocking Edge Cases

- **Third-Party Video Source Availability:** Embed sources provided directly by VSMov endpoints depend on third-party host uptime. If an embed link fails or is removed at source, the built-in error state ("Không thể phát nguồn này") allows users to retry or switch servers cleanly.
- **Guest Bookmark & History Persistence:** Guest favorites and watch history are stored in browser `localStorage`; authenticated sync is handled by the existing local-first SyncEngine.

## 4. Quality Checks & Verification Commands Run

- `npm run lint`: **Pass** (0 errors, 0 warnings)
- `npm run typecheck`: **PASS in WEB-F6** (the previous checkpoint did not run this script)
- `npm run build`: **Pass** (Clean Next.js production compilation)

## 5. Console & Hydration Audit Results

- **Console:** Clean. No React hydration mismatches, no missing `key` prop warnings, and no nested `<a>` tag or `<p>` element hierarchy warnings.
- **Search Engine Indexing:** `/tim-kiem` properly enforces `robots: { index: false, follow: true }`.
- **Dynamic Assets:** `sitemap.ts` and `robots.ts` configured cleanly at root.

## 6. Historical Release Recommendation

- **STATUS:** **READY at the previous QA checkpoint; superseded by WEB-F6 final verification.**

## 7. WEB-F6 Final Verification

### Baseline

- Branch: `feature/web-final-stabilization`
- Baseline commit: `faf12b8 test: harden sync reliability and production e2e`
- Stabilization history: WEB-F1 through WEB-F5 complete.
- Working tree was clean at the start of WEB-F6.

### Automated quality

- `npm ci`: PASS under Node 22.23.2; the earlier local Node 20 environment emitted the known Supabase deprecation warning.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run test:run`: PASS, 8 files / 51 tests.
- `npm run build`: PASS.
- `npm run test:e2e`: PASS, production build followed by `next start`, 5/5 tests.
- `npm run test:e2e:run` repeated three additional times: PASS, 5/5 each run.
- `git diff --check`: PASS.

### Production-mode E2E

Playwright uses `npm run start -- --hostname 127.0.0.1 --port 3100` and does not reuse an existing server. The five smoke tests passed in the main run and all three additional runs.

### Route smoke

Browser smoke covered home, search, discovery, detail, watch, watchlist, history, category, genre, country, year, and login routes. The real movie route `/phim/giac-mo-trao-em` and watch route `/xem-phim/giac-mo-trao-em` rendered successfully. No browser console errors were observed during this pass.

### Responsive status

The source audit found mobile/desktop breakpoint handling, mobile navigation, safe-area styles, and `overflow-x: hidden`. Interactive browser validation was performed at the default desktop viewport; the connected browser did not expose a viewport override capability, so all requested widths were not independently exercised in this pass.

### Provider, player, and sync status

- VSMov remains the primary provider.
- VSMov timeout is 10 seconds and retry is bounded to two attempts.
- Existing PhimAPI detail fallback and `one-piece` / `dao-hai-tac` alias handling remain bounded.
- Direct HLS, native HLS, hls.js, bounded recovery, iframe fallback, progress, history, and player controls remain unchanged by WEB-F6.
- WEB-F5 sync/auth tests remain green; no real Supabase credentials were used.

### SEO and runtime configuration

- PHEVO metadata, sitemap, and robots use `getSiteUrl()`.
- `NEXT_PUBLIC_SITE_URL` is the production deployment requirement; localhost is only the safe development fallback.
- CI uses Node 22.
- `package.json` now declares `engines.node` as `>=22`.
- `package-lock.json` is the only dependency lockfile; `bun.lock` is absent.

### Known risks and release recommendation

- `npm audit` reports 10 vulnerabilities: 7 moderate and 3 high, including transitive Next/PostCSS/sharp findings and Firebase tooling findings. Available automated fixes require a major Next.js or Firebase Tools upgrade, which is outside WEB-F6 scope.
- Next warns that `next start` is paired with the existing `output: 'standalone'` configuration and recommends the standalone server entrypoint; production-mode smoke tests nevertheless pass consistently.
- Provider artwork, API, and playback availability remain dependent on third-party VSMov infrastructure.
- Recommended status: **READY WITH KNOWN LIMITATIONS**.

### Web freeze

The web architecture is considered stable for reference use while Android TV work begins. Bug fixes, security fixes, and maintenance remain allowed; major provider, UI, state-management, sync, player, and route rewrites should be deferred.
