# WEB-UI1 — FULL UI/UX AUDIT & VISUAL CONTRACT

**Phase:** WEB-UI1  
**Status:** COMPLETE (Planning & Contract Freeze)  
**System Target:** PHEVO Web Next  
**Document Type:** Architectural Audit & Frozen Visual Contract  
**Baseline Hash / Freeze:** K7 Frozen (`WEB_K7_STABILIZATION_ARCHITECTURE_FREEZE.md`)

---

## 1. EXECUTIVE SUMMARY & CONSTRAINTS

### 1.1 Purpose & Scope
This audit establishes an exhaustive visual, spatial, typographical, and accessibility baseline for the PHEVO Web Next streaming platform. Following the successful completion and freeze of functional stabilization in **WEB-K7**, the underlying movie provider architecture (`MovieProvider` -> `KkPhimMovieProvider` -> `phimapi.com`), TMDB enrichment layer, direct HLS/Plyr playback engine, and local-first persistence synchronizer are permanently locked.

The goal of WEB-UI1 is to audit every existing UI surface, identify design friction, inconsistencies, and micro-interaction gaps, and define an uncompromising **Visual Contract** and **Execution Roadmap (UI2–UI9)**.

### 1.2 Non-Negotiable Boundaries
1. **Zero Architecture Regressions:** No modifications to `lib/api/`, `lib/tmdb/`, `lib/persistence/`, `lib/sync/`, or `lib/auth/`.
2. **Player Protection:** Player state lifecycle, HLS.js attachment, Plyr instantiation, time tracking intervals, source error recoveries, and embed fallbacks in `components/player/VideoPlayer.tsx` are strictly preserved.
3. **Android TV Exclusion:** Android TV codebase (`android-tv/`) is completely isolated and out of scope.
4. **No Package Bloat:** No external dependencies added without explicit justification and approval.
5. **No Redesign in Audit Phase:** WEB-UI1 delivers audit findings, tokens, component boundaries, and phase definitions without breaking production code.

---

## 2. DESIGN PHILOSOPHY & VISUAL ARCHITECTURE

### 2.1 Aesthetic Archetype: Cinematic Dark Elegance
PHEVO adheres to a modern, content-first cinematic dark visual language designed for immersive video discovery across desktop, tablet, and mobile displays.

* **Palette Principles:**
  * Backgrounds are deeply anchored neutral-blacks (`#080808` to `#121212`) avoiding pure `#000000` to prevent visual clipping and harsh contrast against high-key posters.
  * Brand Accent: `#e50914` (Cinematic Red) reserved exclusively for high-intent actions (Play, Watch Now, Primary CTA, Active Indicators).
  * Supporting Accents: Emerald (`#10b981`) for completed progress / sync, Amber (`#f59e0b`) for ratings and VIP badges, Neutral Grays (`#737373` - `#f5f5f5`) for hierarchy.
* **Prohibited Visual Anti-Patterns:**
  * ❌ No arbitrary purple-to-blue gradients or neon glassmorphism.
  * ❌ No cartoonish rounded corners on media assets (caps at 8px-12px for cards, 16px for dialog containers).
  * ❌ No nested cards (card inside a card) or arbitrary thick colored side borders.
  * ❌ No SaaS-style marketing hero blocks with exaggerated metrics.
  * ❌ No non-standard icon systems (Lucide-react is the sole icon authority).

### 2.2 Typographic Hierarchy & Scale
| Level | Font Weight | Desktop Size / Leading | Mobile Size / Leading | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Hero H1** | Extrabold (800) | `3rem` (48px) / 1.15 | `1.75rem` (28px) / 1.2 | Hero Banner title, Watch page title |
| **Section H2** | Bold (700) | `1.5rem` (24px) / 1.25 | `1.25rem` (20px) / 1.3 | Category Rails, Page Headers |
| **Card / Item H3** | Semibold (600) | `0.875rem` (14px) / 1.3 | `0.75rem` (12px) / 1.3 | Movie Card Titles, Dialog Headings |
| **Body Primary** | Regular (400) / Medium (500) | `0.875rem` (14px) / 1.6 | `0.875rem` (14px) / 1.5 | Overviews, Cast Lists, Descriptions |
| **Caption / Metadata** | Medium (500) / Bold (700) | `0.75rem` (12px) / 1.4 | `0.6875rem` (11px) / 1.3 | Year, Duration, Episode Badges, Server Tabs |
| **Micro Badge** | Bold (700) / Black (900) | `0.625rem` (10px) / 1.0 | `0.625rem` (10px) / 1.0 | HD, Vietsub, Quality chips |

---

## 3. SECTION-BY-SECTION UI SURFACE AUDIT

### Section A: Global Layout & Navigation Frame
* **Files:** `components/layout/Header.tsx`, `components/layout/Footer.tsx`, `components/layout/BottomNav.tsx`, `components/layout/MobileNav.tsx`, `app/layout.tsx`
* **Current Implementation:**
  * Sticky header with scroll-aware background blur transition (`bg-[#080808]/90`).
  * Desktop navigation with dropdown taxonomy menus (Genre, Country, Year).
  * Instant search dropdown with live API debounce and keyboard selection.
  * Mobile drawer (`MobileNav`) + Mobile fixed bottom bar (`BottomNav`).
  * Footer with sitemap, legal disclaimer, and TMDB attribution badge.
* **Audit Findings & Friction Points:**
  1. *Z-Index Stacking:* Search dropdown (`z-50`), Header (`z-40`), Filter Dialog (`z-50`), Bottom Nav (`z-40`) occasionally fight for priority during modal dialog openings.
  2. *Mobile Safe Area Insets:* Bottom nav accounts for `env(safe-area-inset-bottom)`, but some bottom-padded page containers do not maintain uniform `pb-20` on mobile, causing content clipping under the bar.
  3. *Scroll Lock Synchronization:* Mobile nav drawer locks body scroll, but search modal popup does not uniformly lock background gestures on iOS WebKit.
* **Contract Mandates (UI2 Scope):**
  * Standardize z-index scale: Base (0), Rails (10), Header (40), BottomNav (45), Modals/Dialogs (50), Toasts (60).
  * Ensure uniform safe-area padding across all route layouts (`pb-24 md:pb-8`).

---

### Section B: Homepage Hero & Discovery Rails
* **Files:** `app/page.tsx`, `components/movie/HeroBanner.tsx`, `components/movie/MovieRow.tsx`, `components/movie/RecentHistoryRow.tsx`
* **Current Implementation:**
  * Hero carousel displaying top 5 curated movies with auto-rotation (8s), backdrop crossfade, quick trailer trigger, and direct Play CTA.
  * Local-first continuation rail (`RecentHistoryRow`) rendering real playback progress percent and resume links.
  * 5 thematic movie rails with horizontal scroll controls, gradient masks, and responsive card sizing.
* **Audit Findings & Friction Points:**
  1. *Hero Text Contrast:* Low-key backdrop images sometimes degrade subtitle and description readability when viewport width shrinks below 640px.
  2. *Carousel Indicator Hitboxes:* Indicator pills on mobile are 6px tall, presenting a small tap target (<24px) violating touch target guidelines.
  3. *Rail End-Of-Scroll Clamping:* Horizontal scrolling rows lack a tactile end boundary or snap behavior on touch devices.
* **Contract Mandates (UI3 Scope):**
  * Enhance Hero scrim gradient from `bg-gradient-to-t from-[#080808] via-[#080808]/60 to-transparent` with responsive radial vignette.
  * Expand hero indicator tap targets to min 44x44px invisible padding box.
  * Implement `scroll-snap-type: x mandatory` with smooth scroll behavior on `MovieRow`.

---

### Section C: Movie Card & Media Display Primitives
* **Files:** `components/movie/MovieCard.tsx`, `components/movie/MovieGrid.tsx`, `components/ui/MovieBadge.tsx`, `components/ui/MovieImage.tsx`
* **Current Implementation:**
  * Aspect ratio `2/3` standard poster card with hover elevation, subtle scale transform (`scale-[1.03]`), badge overlays (Quality, Episode count, Lang), and quick bookmark toggle.
  * Defensive image loading with Next.js Image optimization and fallback placeholders.
* **Audit Findings & Friction Points:**
  1. *Bookmark Button Hover Ambiguity:* Quick bookmark button is hidden on desktop until hover, preventing keyboard navigation access without tab focus styling.
  2. *Card Title Truncation:* Titles with 2+ lines sometimes wrap awkwardly when year/badge container expands.
* **Contract Mandates (UI4 Scope):**
  * Lock card title to strict 2-line clamp with fixed line-height container to eliminate layout shifting.
  * Ensure bookmark button retains visible focus-visible outline on tab focus regardless of hover state.

---

### Section D: Movie Detail View (Presentation Layer)
* **Files:** `app/phim/[slug]/page.tsx`, `components/movie/MovieDetails.tsx`, `components/movie/MovieBackdrop.tsx`, `components/movie/CastList.tsx`
* **Current Implementation:**
  * Enriched layout with dynamic TMDB backdrop, poster, bilingual title, runtime, release year, genres, rating, full overview, trailer modal, and cast scroll.
  * Tabbed episode grid showing available servers and episode chunks.
* **Audit Findings & Friction Points:**
  1. *Server Tab Visual Hierarchy:* When multiple servers exist, active server tab lacks distinctive contrast against inactive server tabs in high ambient light.
  2. *Cast Avatar Fallback:* Cast members without TMDB profile pictures render a basic initial circle that lacks cinematic consistency.
* **Contract Mandates (UI5 Scope):**
  * Highlight active server with solid brand accent (`bg-[#e50914] text-white`) and subtle glow shadow.
  * Standardize cast avatar fallback with high-definition slate-gradient silhouette.

---

### Section E: Watch & Playback Surface (Visual Frame Only)
* **Files:** `app/xem-phim/[slug]/page.tsx`, `components/player/VideoPlayer.tsx`, `components/movie/EpisodeSelector.tsx`
* **Current Implementation:**
  * Dual-mode player (Direct HLS with Plyr skin + Trusted Embed iframe fallback).
  * Server selector, chunked episode pagination (50 episodes per tab), keyboard hotkeys, cinema lights toggle, and auto-next prompt.
* **Audit Findings & Friction Points:**
  1. *Player Control Contrast:* Top utility bar (Cinema mode, server info, report issue) can occlude video content on small mobile viewports in landscape mode.
  2. *Episode Active Indicator:* Active episode chip in long lists (e.g. 50+ episodes) needs auto-scroll into view when page loads with `?ep=slug`.
* **Contract Mandates (UI6 Scope - Strictly Cosmetic & Layout):**
  * NO alterations to HLS/Plyr/iframe logic.
  * Optimize layout margins on watch page for 16:9 theatrical aspect ratio.
  * Ensure episode grid smoothly highlights active episode without re-triggering parent renders.

---

### Section F: Search, Filtering & Discovery Engine (UI View)
* **Files:** `app/tim-kiem/page.tsx`, `app/kham-pha/page.tsx`, `components/movie/DiscoveryClientView.tsx`, `components/movie/DiscoveryFilterDialog.tsx`, `components/movie/Pagination.tsx`
* **Current Implementation:**
  * Server-driven discovery with multi-parameter filter dialog (Genre, Country, Year, Type, Sort, Order).
  * Active filter chips with one-click removal and reset.
  * Capability-aware filter feedback preventing unsupported server combinations.
* **Audit Findings & Friction Points:**
  1. *Mobile Filter Modal Reachability:* Filter dialog on small phones requires scrolling to reach the "Apply" CTA.
  2. *Search Input Hitbox:* Search input clear button (`X`) is 16px; tap target should be expanded for mobile touch comfort.
* **Contract Mandates (UI7 Scope):**
  * Dock Filter Modal footer actions ("Reset", "Apply") to the bottom of the viewport on mobile screens (`sticky bottom-0`).
  * Ensure all interactive chips have 44px min tap bounds.

---

### Section G: User Collections, History & Auth UI
* **Files:** `app/yeu-thich/page.tsx`, `app/lich-su/page.tsx`, `app/dang-nhap/page.tsx`, `components/auth/UserMenu.tsx`
* **Current Implementation:**
  * Local-first Watchlist and History pages with real-time reactive sync.
  * Empty states with contextual iconography and navigation actions.
  * Google OAuth login screen with clear guest mode fallback explanation.
* **Audit Findings & Friction Points:**
  1. *Batch Actions:* History page has "Clear All" but lacks individual item multi-select removal for bulk management.
  2. *Guest-to-Auth Banner:* Notice explaining local vs cloud sync on login page is slightly verbose.
* **Contract Mandates (UI8 Scope):**
  * Polish empty state artwork and typography.
  * Refine login card visual balance with sleek glass border and subtle brand emblem.

---

### Section H: System Feedback, Loading & Error States
* **Files:** `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`, `components/ui/Skeleton.tsx`, `components/ui/Toast.tsx`, `components/ui/ErrorState.tsx`, `components/ui/EmptyState.tsx`
* **Current Implementation:**
  * Shimmering skeleton loaders for cards, rows, grids, and hero banner.
  * Unified ErrorState with retry trigger and home fallback.
  * 404 page styled with cinematic movie aesthetic.
* **Audit Findings & Friction Points:**
  1. *Skeleton Animation Performance:* Too many simultaneous CSS pulse animations on low-powered mobile devices can cause minor frame drops.
  2. *Toast Notification Positioning:* Toasts on mobile appear at bottom-right, occasionally colliding with the bottom navigation bar.
* **Contract Mandates (UI9 Scope):**
  * Optimize skeletons with lightweight CSS shimmer using GPU-accelerated transforms.
  * Offset mobile toasts to `bottom-20` to prevent bottom-nav occlusion.

---

## 4. DESIGN TOKENS & SYSTEM CONTRACT

### 4.1 Color Tokens
```css
/* Core Canvas & Surfaces */
--bg-canvas: #080808;
--bg-surface-1: #101010;
--bg-surface-2: #161616;
--bg-surface-3: #202020;
--bg-surface-elevated: #282828;

/* Borders & Separators */
--border-subtle: #1f1f1f;
--border-default: #2a2a2a;
--border-highlight: #3a3a3a;

/* Brand & Interactive */
--brand-primary: #e50914;
--brand-hover: #b80710;
--brand-subtle: rgba(229, 9, 20, 0.15);

/* Text & Foreground */
--text-primary: #f5f5f5;
--text-secondary: #a3a3a3;
--text-tertiary: #737373;
--text-muted: #525252;
```

### 4.2 Spacing & Layout Matrix
* **Outer Container Padding:**
  * Mobile (320px - 639px): `16px` (`px-4`)
  * Tablet (640px - 1023px): `24px` (`px-6`)
  * Desktop (1024px+): `32px` (`px-8`)
  * Max Canvas Width: `1920px` (`max-w-[1920px] mx-auto`)
* **Grid Breakpoints:**
  * `xs` (320px): 2 columns (140px min card)
  * `sm` (640px): 3 columns
  * `md` (768px): 4 columns
  * `lg` (1024px): 5 columns
  * `xl` (1280px): 6 columns
  * `2xl` (1536px+): 7-8 columns

---

## 5. SAFE EDIT MAP (UI PHASES)

To maintain absolute stability and protect frozen business logic, all future UI work must strictly abide by this categorical access matrix:

| Category | Allowed Directories / Files | Permitted Actions |
| :--- | :--- | :--- |
| **SAFE_UI** | `components/ui/**`, `components/layout/**`, `app/globals.css`, presentation markup in `app/**/*.tsx` | Full styling, Tailwind class adjustments, DOM restructuring for visual hierarchy, responsiveness, accessibility tags. |
| **UI_WITH_CAUTION** | `components/movie/MovieCard.tsx`, `components/movie/MovieDetails.tsx`, `components/movie/EpisodeSelector.tsx`, `components/movie/DiscoveryFilterDialog.tsx` | Visual styling and layout adjustments only. **MUST NOT** change prop types, event handler signatures, or state synchronization hooks. |
| **PROTECTED_PLAYER** | `components/player/VideoPlayer.tsx` | Layout wrapper, player frame sizing, toolbar styling only. **STRICTLY FORBIDDEN** from modifying HLS/Plyr lifecycle, progress dispatchers, cleanup hooks, or source switches. |
| **PROTECTED_CORE** | `lib/api/**`, `lib/tmdb/**`, `lib/persistence/**`, `lib/sync/**`, `lib/auth/**`, `types/**` | **ABSOLUTELY FROZEN.** No modifications allowed during UI phases. |
| **OUT_OF_SCOPE** | `android-tv/**`, `.github/**` | Frozen and excluded from all Web Next phases. |

---

## 6. GOOGLE AI STUDIO / AGENT CONTRACT

### What AI Agents MAY Do During UI2–UI9:
1. Refactor Tailwind utility classes for consistent typography, contrast, and spacing.
2. Polish micro-interactions, hover states, active indicators, and focus rings.
3. Enhance mobile responsiveness across `320px`, `390px`, `768px`, and `1440px`.
4. Standardize empty states, skeleton loading placeholders, and error banners.
5. Improve accessibility attributes (`aria-label`, `role`, `aria-expanded`, keyboard focus).

### What AI Agents MUST NOT Do:
1. ❌ Modify API fetching logic or provider adapters.
2. ❌ Touch TMDB enrichment normalization routines.
3. ❌ Alter localStorage repository keys or serialization formats.
4. ❌ Change Supabase authentication flows or synchronization engine queue logic.
5. ❌ Re-write VideoPlayer HLS.js / Plyr initialization code.
6. ❌ Install new NPM dependencies without approval.
7. ❌ Introduce client-side mock data engines or fake backend capabilities.

---

## 7. EXECUTION ROADMAP: UI2 THROUGH UI9

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHEVO WEB UI ROADMAP (UI2 - UI9)                   │
├─────────┬───────────────────────────────┬───────────────────────────────┤
│ Phase   │ Focus Area                    │ Target Components / Pages     │
├─────────┼───────────────────────────────┼───────────────────────────────┤
│ UI2     │ Global Frame & Navigation     │ Header, Footer, MobileNav,    │
│         │ Architecture                  │ BottomNav, Layout Shell       │
├─────────┼───────────────────────────────┼───────────────────────────────┤
│ UI3     │ Homepage & Cinematic Hero     │ HeroBanner, MovieRow,         │
│         │ Discovery Rails               │ RecentHistoryRow, HomePage    │
├─────────┼───────────────────────────────┼───────────────────────────────┤
│ UI4     │ Movie Card & Media Display    │ MovieCard, MovieGrid,         │
│         │ Primitives                    │ MovieBadge, MovieImage        │
├─────────┼───────────────────────────────┼───────────────────────────────┤
│ UI5     │ Movie Detail Presentation     │ MovieDetails, CastList,       │
│         │ Layer                         │ MovieBackdrop, /phim/[slug]   │
├─────────┼───────────────────────────────┼───────────────────────────────┤
│ UI6     │ Watch & Playback Surface      │ Watch Layout, EpisodeSelector,│
│         │ (Cosmetic & Layout Only)      │ Theatrical Frame (Protected)  │
├─────────┼───────────────────────────────┼───────────────────────────────┤
│ UI7     │ Discovery, Filter & Search    │ DiscoveryClientView, Filter,  │
│         │ Views                         │ SearchPage, Pagination        │
├─────────┼───────────────────────────────┼───────────────────────────────┤
│ UI8     │ User Library, History & Auth  │ Watchlist, History, Login,    │
│         │ Polishing                     │ UserMenu, Empty States        │
├─────────┼───────────────────────────────┼───────────────────────────────┤
│ UI9     │ System States, Transitions,   │ Skeletons, Toasts, 404,       │
│         │ Accessibility & QA Signoff    │ ErrorBoundaries, Full Audit   │
└─────────┴───────────────────────────────┴───────────────────────────────┘
```

---

## 8. AUDIT VERIFICATION & QUALITY GATES

* **Static Analysis:**
  * ESLint: 0 errors, 5 non-blocking hook warnings in protected player.
  * TypeScript Typecheck: 0 errors (`npx tsc --noEmit` clean).
  * Production Build: `npm run build` SUCCESS.
* **Status:** WEB-UI1 is verified, closed, and ready for phase-by-phase execution starting at **WEB-UI2**.
