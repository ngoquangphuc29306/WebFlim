# PHEVO Android TV Design System

Status: TV-0 source of truth  
Product: PHEVO  
Platform: Android TV, 10-foot, remote-first  
Implementation target: Kotlin + Jetpack Compose for TV

This document defines the visual and interaction language for the native PHEVO TV application. It is derived from the current web implementation, but it is not a pixel copy of the web layout. TV layouts must optimize for distance, D-pad focus, predictable movement, and low cognitive density.

## 1. Source audit

The current web implementation was audited in:

- `app/globals.css` — base colors, gradients, reduced-motion behavior, safe-area handling.
- `components/layout/Header.tsx`, `HeaderSearch.tsx`, `MobileNav.tsx`, `UserAccountMenu.tsx`, `Footer.tsx` — brand, navigation, search, account and sync-status language.
- `components/movie/HeroBanner.tsx` — hero composition, backdrop treatment, CTAs and metadata badges.
- `components/movie/MovieCard.tsx`, `MovieRow.tsx`, `MovieGrid.tsx` — poster ratio, rows, artwork-first hierarchy and spacing.
- `components/movie/MovieDetails.tsx`, `EpisodeSelector.tsx` — detail hierarchy, actions, metadata, server and episode semantics.
- `components/player/VideoPlayer.tsx`, `components/player/hooks/useHlsPlayer.ts` — player states and source terminology only; no TV player is implemented here.
- `components/ui/MovieButton.tsx`, `MovieBadge.tsx`, `MovieImage.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx` — shared controls, artwork fallback and state language.
- `app/page.tsx`, `app/phim/[slug]/page.tsx`, `app/xem-phim/[slug]/page.tsx`, `app/tim-kiem/page.tsx`, `app/yeu-thich/page.tsx`, `app/lich-su/page.tsx`, `app/dang-nhap/page.tsx` — content hierarchy and route semantics.
- `types/movie.ts`, `lib/persistence/**`, `lib/sync/**` — domain identity and persistence semantics.

### Observed web language

The product is dark, cinematic, restrained, and content-first. Movie artwork supplies most of the visual richness. The web UI uses a near-black canvas, charcoal surfaces, white primary text, neutral gray metadata, a restrained red action color, 2:3 posters, subtle borders, modest rounded corners, and short opacity/scale transitions. It avoids dashboard density and decorative UI as the main focus.

The TV system keeps that language and changes the scale, focus treatment, navigation model, and content density for a 10-foot environment.

## 2. Visual principles

1. **Content first.** Artwork, title, and the next useful action receive the strongest hierarchy.
2. **Cinematic, not theatrical.** Use dark surfaces and controlled scrims; do not fill the screen with animation or glow.
3. **Calm focus.** A user must always know where the D-pad will move next.
4. **Readable at distance.** Metadata is optional and concise; nothing essential depends on tiny text.
5. **One accent.** PHEVO red identifies action and focus. Amber is reserved for ratings/quality semantics.
6. **Low density.** Prefer fewer, larger targets and bounded rows over dense dashboards.
7. **Honest states.** Loading, empty, offline, and error states explain the situation without decorative noise.
8. **No web assumptions.** Hover, pointer position, touch swipe, and browser-only controls are not required for TV usability.

Avoid glassmorphism, heavy gradients, excessive glow, mobile-sized cards, tiny labels, excessive badges, gamification, parallax, and long transitions.

## 3. Color tokens

The values below normalize the existing web variables (`--background-primary`, `--background-secondary`, `--surface`, `--surface-hover`, `--surface-border`, text variables, and brand accent) into semantic TV tokens. The red accent remains the existing PHEVO identity; this is not a new palette.

| Token | Value | Use |
|---|---|---|
| `AppBackground` | `#080808` | Root screen and player shell background |
| `SurfacePrimary` | `#101010` | Main panels, rows, dialogs |
| `SurfaceSecondary` | `#141414` | Cards, controls, secondary panels |
| `SurfaceElevated` | `#1A1A1A` | Focused/raised surfaces and selected navigation |
| `BorderSubtle` | `#262626` | Quiet separation; never the only focus cue |
| `TextPrimary` | `#F5F5F5` | Titles, primary actions, current selection |
| `TextSecondary` | `#A3A3A3` | Supporting text and readable metadata |
| `TextMuted` | `#737373` | Non-essential metadata and hints |
| `TextDisabled` | `#525252` | Disabled controls; pair with disabled treatment, not color alone |
| `BrandPrimary` | `#E50914` | Primary CTA, active state, focus accent |
| `BrandFocused` | `#F40612` | Focus/pressed hover-equivalent where extra contrast is needed |
| `Success` | `#22C55E` | Sync or completion confirmation |
| `Warning` | `#F59E0B` | Rating/quality and non-fatal warning semantics |
| `Error` | `#EF4444` | Error state and failed operation |
| `FocusOutline` | `#F40612` | 2dp minimum visible focus outline |
| `FocusSurface` | `#1A1A1A` | Focused card/control surface |
| `FocusText` | `#FFFFFF` | Focused label/title |
| `ScrimStrong` | `rgba(8,8,8,0.88)` | Text legibility over artwork |
| `ScrimMedium` | `rgba(8,8,8,0.62)` | Hero/player supporting scrim |
| `ScrimLight` | `rgba(8,8,8,0.28)` | Light separation over artwork |

Rules:

- Do not use red for ordinary decoration or large backgrounds.
- Do not use amber as a second brand color; reserve it for rating/quality meaning.
- Focus must use outline, contrast, or scale in addition to color.
- Hero gradients are directional scrims for readability, not a permanent visual effect across the application.

## 4. Typography

Use the platform sans-serif family unless the Android product later adopts a bundled brand font. Values are starting points for a 1080p TV and should scale through Compose typography rather than hardcoded pixel sizes.

| Style | Approx. size / line height | Weight | Intended use | Max lines |
|---|---:|---:|---|---:|
| `DisplayLarge` | 40sp / 48sp | 700–800 | Hero title or primary detail title | 2 |
| `DisplayMedium` | 32sp / 40sp | 700 | Screen title or compact hero title | 2 |
| `TitleLarge` | 24sp / 32sp | 700 | Section title, dialog title | 1 |
| `TitleMedium` | 18sp / 24sp | 600–700 | Card title, focused navigation label | 2 |
| `BodyLarge` | 18sp / 28sp | 400 | Synopsis and important explanatory copy | 4 |
| `BodyMedium` | 16sp / 24sp | 400–500 | Supporting content and empty/error descriptions | 3 |
| `LabelLarge` | 16sp / 20sp | 600–700 | Buttons, tabs, server/episode actions | 1 |
| `Metadata` | 14sp / 20sp | 500 | Year, duration, type, episode and status | 1 |

TV text rules:

- Prefer one clear title over several small labels.
- Do not put essential state only in `Metadata` size.
- Truncate titles with an ellipsis after two lines; never allow a focused card to move neighboring layout unexpectedly.
- Synopsis text may be clamped to four lines on overview surfaces and expanded on detail if a focused action exists.
- Use sentence case for user-facing Vietnamese labels; reserve uppercase for short badges only.

## 5. Spacing and sizing

Use an 8dp base rhythm. Values are semantic and should be implemented through a small Compose dimension set.

| Token | Value | Use |
|---|---:|---|
| `SpaceXS` | 4dp | Icon-to-label micro gap |
| `SpaceSM` | 8dp | Badge internals, compact gaps |
| `SpaceMD` | 16dp | Card metadata, control groups |
| `SpaceLG` | 24dp | Card/row gaps, panel padding |
| `SpaceXL` | 32dp | Section separation, detail columns |
| `Space2XL` | 48dp | Screen regions |
| `Space3XL` | 64dp | Hero-to-content and major screen separation |

1080p layout guidance:

- Content safe area: 48dp minimum on all sides; use 64dp horizontal padding on wide home/detail screens when content permits.
- Navigation rail clearance: reserve the rail width before calculating content width.
- Section spacing: 32dp between a row and the next row; 48dp between major regions.
- Movie card gap: 16–24dp depending on available width.
- Minimum focusable target: 48dp; prefer 56dp for primary actions and remote targets.
- Keep important text and controls away from the outermost 5% of the screen.
- Do not assume 1080p density is one dp per pixel. Compose layout uses dp and scales with the device density.

## 6. Shapes and elevation

| Component | Shape guidance | Elevation guidance |
|---|---|---|
| Poster card | 8dp radius | 0–2dp default, 6dp focused |
| Landscape card | 8dp radius | 0–2dp default, 6dp focused |
| Primary/secondary button | 8dp radius | 2–4dp when focused/pressed |
| Chip/badge | 4–6dp radius | No floating shadow |
| Dialog | 12dp radius | 12dp above `SurfacePrimary` |
| Player overlay | 0–8dp, based on region | Scrim supplies separation |
| Detail panel | 12dp radius where a panel is needed | Keep elevation subtle |

The web detail poster currently uses a larger radius than cards. On TV, normalize it to the restrained system above unless a future design review approves a distinct detail treatment. Avoid making every element a pill.

## 7. Focus model

Focus is the primary interaction language, not a desktop hover replacement.

| State | Treatment |
|---|---|
| Default | `scale 1.0`, `SurfaceSecondary`, subtle border, normal elevation |
| Focused | `scale 1.06` (allowed range 1.05–1.08), 2dp `FocusOutline`, `SurfaceElevated`, 6dp elevation, `TextPrimary` |
| Pressed | Keep the focused outline; briefly reduce scale to about 1.02 and use `BrandFocused` for primary actions |
| Disabled | `TextDisabled` and reduced contrast/opacity; retain layout and expose disabled semantics |

Focus motion:

- Scale/outline transition: 160ms ease-out.
- Do not use a large zoom that covers neighboring cards.
- Focused poster title and essential metadata must remain high contrast.
- A focusable card must expose a content description containing the movie title and useful status, such as year or episode, without reading every badge twice.
- Focus must be visible before any action is taken; never rely only on a subtle border.

Focus hierarchy:

1. Modal/dialog action or the current primary action.
2. Screen-level navigation and search entry.
3. Hero CTA.
4. Current content row and focused card.
5. Secondary metadata and optional actions.

## 8. D-pad navigation rules

- **Left/Right:** move between siblings in the current row or control group.
- **Up/Down:** move to the nearest logical item in the adjacent row or region, preserving horizontal intent where possible.
- **Center/Enter:** activate the focused item; do not require a second pointer-like confirmation.
- **Back:** close a dialog/overlay first, then collapse a navigation rail if expanded, then return to the previous screen. On the root screen, Back follows the Android TV app policy rather than navigating to a fake destination.
- **Initial focus:** Home opens on the first actionable hero CTA when a hero exists; otherwise it opens on the first available content card. Search opens on the search field. Dialogs focus the primary safe action.
- **Focus memory:** each horizontal row stores the last focused item index while the screen remains alive. Returning to a screen restores the last valid item when possible.
- **Scroll-to-focused:** a focused card is brought fully into view with bounded, non-animated or short animated scrolling. Focus must never disappear offscreen.
- **Rows:** moving down from a card targets the closest card in the next row; moving up from the first content row targets the hero or navigation region according to the screen template.
- **Navigation rail:** Left from content enters the rail; Right returns to content at the last remembered destination. The rail must not trap focus when collapsed.
- **Dialogs:** trap focus within the dialog until Back closes it. Never allow D-pad movement into the obscured screen.
- **Disabled items:** remain in the spatial map only when their disabled state is meaningful; do not let focus land on a dead control if there is a predictable valid neighbor.

## 9. Motion system

Motion is short, informative, and subordinate to navigation.

| Motion | Duration |
|---|---:|
| Card focus scale/outline | 160ms |
| Button state/opacity | 120–160ms |
| Hero/content crossfade | 220ms |
| Screen transition | 180–240ms |
| Dialog/overlay appearance | 160ms |

Avoid long cinematic transitions, constant background motion, large parallax, and spring overshoot that delays D-pad response. Respect Android reduced-motion/accessibility preferences and provide an immediate state change when motion is reduced.

## 10. Card system

All cards are conceptual TV components in TV-0; no Compose source is created here.

| Component | Layout / content | Focus and loading rules |
|---|---|---|
| `PosterMovieCard` | 2:3 poster; title below; optional year, episode, quality | Focus scale/outline above; title max two lines; skeleton reserves poster and two title lines |
| `LandscapeMovieCard` | About 16:9 artwork with title and one metadata line | Use for Continue Watching or editorial context; no dense badge stack |
| `ContinueWatchingCard` | Artwork, title, episode, progress bar | Progress is factual only; focus reveals Continue/Resume action, not fabricated time |
| `EpisodeCard` | Episode label, optional watched/progress state | Minimum 56dp height; current episode uses focus plus selected state |
| `ServerChip` | Short server name | 48dp minimum target; selected state uses red plus outline/label |
| `GenreChip` | Short taxonomy label | Optional navigation target; avoid making the screen a chip wall |
| `ActionButton` | Icon + concise Vietnamese label | 56dp minimum height; primary action uses `BrandPrimary`, secondary uses `SurfaceElevated` |

Loading placeholders must match final dimensions. Empty artwork uses the existing PHEVO film fallback concept; it must never show a browser broken-image icon or imply real artwork.

## 11. Movie rows

Every row has:

- a `TitleLarge` section title;
- an optional `Xem tất cả` action, placed after the title in the row's focus order;
- a bounded horizontal track;
- remembered focus index;
- automatic scroll-to-focused behavior;
- a stable loading skeleton with the same card dimensions.

Home should show a limited number of high-value rows. Recommended order is Hero, Continue Watching when populated, newest/recommended content, series/single content, and one or two meaningful exploration rows. Do not render every taxonomy as a simultaneous wall.

## 12. Hero system

The TV hero is a focused introduction, not a full detail page.

Composition:

- 16:9 or wide backdrop with `ScrimStrong` toward the text side and `ScrimMedium` toward the artwork side;
- title in `DisplayLarge`, maximum two lines;
- at most three short metadata items;
- synopsis limited to four lines;
- primary `Xem ngay`/`Tiếp tục xem` CTA and secondary `Chi tiết` CTA;
- optional watchlist action only when it does not compete with the primary CTA.

Initial focus lands on the primary CTA. If the hero is unavailable, the screen starts at the first content row. Auto-advancing hero slides are not required for TV-0; if later used, focus must not be stolen and slide changes must pause while the user is interacting.

## 13. Primary navigation

### Decision: left navigation rail

PHEVO TV uses a left navigation rail rather than a top navigation bar. A rail leaves the vertical content hierarchy available for hero and rows, maps cleanly to Left/Right remote movement, and keeps the primary destinations visible without shrinking title and card sizes. It also scales better when Account/Settings is added later.

Destinations, in order:

1. Home (`Trang chủ`)
2. Search (`Tìm kiếm`)
3. Explore (`Khám phá`)
4. Watchlist (`Yêu thích`)
5. History (`Lịch sử`)
6. Account/Settings (`Tài khoản` / `Cài đặt`)

The rail may render as a compact icon column with a focused label, but this is an implementation detail. It must preserve a stable focus order and never cover the primary content.

## 14. Screen templates

### Home

Regions: navigation rail, hero, Continue Watching if populated, two to four content rows, and a compact footer/about affordance only if needed. Initial focus is the hero primary CTA. Empty sections disappear rather than leaving blank rails. Provider failure renders a readable `ErrorState` with a focused `Thử lại` action when retry is available.

### Search

Regions: title, search field, TV keyboard/input method, result grid or bounded rows. Initial focus is the search field. D-pad Left/Right moves within the field or keyboard; Back first closes keyboard/suggestions, then leaves the screen. Results preserve focus index when the query changes where possible. Empty input, no results, and provider error have distinct readable states.

### Movie Detail

Regions: backdrop, poster, title/metadata, primary Play/Continue CTA, Watchlist action, synopsis, categories/countries, cast/director when available, episode/server section for series, and bounded related content. Initial focus is Play/Continue. Back returns to the previous route and restores the prior list focus.

### Watchlist

Regions: title and poster grid/rows. Initial focus is the first saved item. Empty state explains how to save a movie and offers a focused `Khám phá` action. If local/cloud data is unavailable, show the existing data state rather than fabricating items.

### History

Regions: Continue Watching/history rows with episode and progress context. Initial focus is the most recent valid item. Empty state is concise. Playback progress is displayed only when it is an actual persisted value.

### Player shell

Regions: playback surface, auto-hidden controls, title/episode context, seek/action controls, previous/next episode, and server/source selection when available. Initial focus is the playback surface or primary Play/Pause control depending on the Media3 state. Back first shows controls if hidden, then exits the player. The shell must support D-pad use without assuming a pointer.

### Login / Account

Regions: concise account state, sign-in action, guest-safe explanation, and sync status where relevant. Initial focus is the primary account action. Do not require a phone-style form or claim that Google OAuth is implemented in TV-0.

## 15. Loading, empty, error, and offline states

Reusable states:

- `LoadingState`: stable skeletons or one calm progress indicator; no flashing content.
- `EmptyState`: icon, `TitleMedium`, one short explanation, and one predictable action when useful.
- `ErrorState`: short problem statement, retry action first, Back-safe navigation second.
- `OfflineState`: clear offline wording and locally available content if any; do not claim sync success.

All states have a deterministic initial focus. A retry button is at least 56dp high and is the first actionable element when retry is supported. States use icon plus text, not color alone.

## 16. Accessibility

- Maintain high contrast between `TextPrimary` and dark surfaces.
- Make focus visible on every focusable element, including icons, chips, cards, and dialog actions.
- Provide content descriptions for posters, buttons, navigation destinations, current episode, server, and progress where meaningful.
- Do not communicate watched, selected, or error state only through red/green color.
- Use a minimum 48dp focus target; prefer 56dp for frequent remote actions.
- Keep metadata concise and readable at distance.
- Preserve heading/region semantics in Compose semantics so screen readers can understand the screen hierarchy.
- Support reduced motion by shortening or removing scale and crossfade effects.
- Never make focus disappear after a loading/error transition; restore it to the nearest valid target.

## 17. TV vs web adaptation summary

| Web pattern | TV adaptation | Reason |
|---|---|---|
| Fixed header with desktop/mobile variants | Left navigation rail | Better vertical content space and D-pad mapping |
| Hover scale and browser focus ring | Persistent focused scale + 2dp outline | Remote users need an unambiguous current target |
| Dense 2:3 rails | Fewer, larger cards with remembered focus | Readability and spatial navigation |
| Touch-swipe hero | D-pad CTA focus and optional paused hero rotation | No touch assumption; focus must not be stolen |
| Small search field and suggestions | Search field plus TV keyboard/input method | Remote-first text entry |
| Web episode grid | Larger episode targets and server selector | Remote precision and distance readability |
| Browser HLS/iframe player | Media3 candidate for direct HLS only | Embed pages are not native Media3 media sources |

