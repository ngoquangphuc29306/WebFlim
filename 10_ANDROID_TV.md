# PHASE 10 — ANDROID TV STRATEGY & IMPLEMENTATION

Use this phase ONLY after the desktop/mobile web product is stable.

Read `docs/MASTER_SPEC.md` and `docs/QA_REPORT.md` first if available.

## GOAL

Extend the existing movie product to Android TV without damaging the mature web experience.

Android TV is NOT just a larger mobile screen.

Users primarily interact using:
- D-pad Up
- D-pad Down
- D-pad Left
- D-pad Right
- OK/Enter
- Back
- Play/Pause
- media keys

The UI must be a 10-foot experience.

## FIRST DECISION — CHOOSE DELIVERY MODEL

Evaluate these options against the existing project:

### Option A — WebView shell
Use when:
- personal use/prototype
- fastest APK is the goal
- existing web player works in WebView
- user accepts limitations

Architecture:

```text
Android TV APK
   ↓
WebView
   ↓
TV-specific web route/UI
   ↓
existing web/API
```

### Option B — TV-specific web UI + wrapper
Recommended transitional architecture.

Create TV routes or TV mode without changing normal web UX.

Possible route namespace:

```text
/tv
/tv/phim/[slug]
/tv/xem-phim/[slug]
/tv/tim-kiem
```

### Option C — Native Android TV
Recommended for a polished long-term product.

Preferred modern stack:

```text
Kotlin
Jetpack Compose for TV
AndroidX Media3 / ExoPlayer
```

Architecture:

```text
VSMov API / shared backend contract
          │
     ┌────┴────┐
     │         │
 Next.js    Android TV
   Web       Native App
```

Do not force shared UI code across web and native TV.
Share API contracts/domain behavior conceptually.

## IMPORTANT

Do not immediately write a full native app until:
1. existing API contracts are understood
2. playback source compatibility is known
3. web and TV product scope is clear

## TV UX

### Home
TV rows should have strong spatial focus.

Example:

```text
Hero

Popular
[A] [B] [C] [D] [E]

New
[F] [G] [H] [I] [J]
```

When `C` is focused:
- Left → B
- Right → D
- Down → corresponding item in next row
- Up → previous row/navigation

This spatial navigation is a first-class requirement.

### Focus state
Focused card:
- scale ~1.06–1.10
- clear high-contrast outline/highlight
- optionally reveal title/metadata
- must never be ambiguous

Avoid hover-only UX.

### Typography
TV user may sit 2–4 meters away.

Use larger:
- card titles
- metadata
- buttons
- episode targets

Do not reuse tiny desktop typography.

### Safe layout
Keep important UI away from extreme screen edges.

### Search
Prefer:
- Android TV soft keyboard
- optional voice input later

Do not build a tiny desktop search field that expects a mouse.

## TV WEB MODE

If implementing `/tv` first:

Create a reusable spatial focus navigation system.

Handle keys such as:

```text
ArrowUp
ArrowDown
ArrowLeft
ArrowRight
Enter
Escape / Back equivalent where exposed
```

Do NOT globally hijack keyboard events in ways that break text input or native player controls.

Focus navigation must understand:
- rows
- card index
- disabled/unavailable elements
- scrolling focused item into view

## WEBVIEW WRAPPER

If creating an Android TV WebView prototype:

Required Android considerations:
- TV launcher intent
- Leanback/TV feature declarations
- no touchscreen requirement
- internet permission
- remote Back handling
- fullscreen video behavior
- JavaScript only if required by site/player
- safe WebView settings

Do not enable every insecure WebView setting.

TV app must provide appropriate banner/icon assets before store release.

## NATIVE TV OPTION

If proceeding native:

Recommended layers:

```text
data/
  vsmov service
  DTOs
  repository

domain/
  Movie
  Episode
  Server

ui/
  home
  detail
  search
  player
  components
```

Use Retrofit/Ktor only if justified by project conventions.

Do not duplicate undocumented API assumptions.

## NATIVE PLAYER

If VSMov returns direct HLS/M3U8 compatible URLs:

Prefer AndroidX Media3 / ExoPlayer.

Required player UX:
- play/pause
- seek
- fullscreen TV layout
- remote controls
- episode next/previous
- source/server change
- error state

If source is only an embed page, evaluate compatibility before claiming native Media3 can play it.

Do not extract/reverse-engineer protected player URLs.

## ANDROID TV MANIFEST CONCEPT

The implementation will likely need TV-specific declarations such as:
- `android.software.leanback`
- touchscreen not required
- TV launcher category
- internet permission

Use current Android documentation and project template as source of truth when implementing.

## SHARED PRODUCT RULES

Android TV should reuse the same conceptual:
- VSMov source
- movie slugs
- genres
- country/year discovery
- episode/server semantics
- watch history schema if cross-platform backend exists later

Do not couple TV to internal React component structure.

## TV SCREENS

Minimum:

```text
Home
Movie Detail
Search
Watch/Player
Episode Selector
Settings/About only if necessary
```

Do not port every desktop control simply because it exists.

## PERFORMANCE

TV hardware may be weaker than desktop.

Avoid:
- rendering hundreds of posters
- giant bitmap decoding
- excessive blur
- continuous animation
- deeply nested focusable elements

Use image caching and sensible dimensions.

## TEST DEVICES

At minimum test:
- Android TV emulator
- keyboard D-pad simulation
- one real Android TV / Google TV device if available

Test:
- focus never disappears
- Back behavior
- app resume
- player resume
- network loss
- image loading
- 1080p
- 4K layout scaling where possible

## PHASED TV IMPLEMENTATION

Recommended:

### TV-A
Architecture decision document.

### TV-B
TV UI prototype / `/tv`.

### TV-C
D-pad/spatial navigation.

### TV-D
Android TV wrapper APK if personal/prototype goal.

### TV-E
Native Compose TV home/detail/search.

### TV-F
Native Media3 player where source compatibility permits.

Do not jump directly to TV-F.

## COMPLETION CRITERIA FOR A WEBVIEW/TV-WEB MVP

- [ ] App launches from Android TV launcher
- [ ] Remote can navigate all essential UI
- [ ] Focus is always visible
- [ ] Home works
- [ ] Detail works
- [ ] Search works
- [ ] Episode/server selection works
- [ ] Player works or has explicit compatibility limitation
- [ ] Back behavior works
- [ ] no touchscreen required

## COMPLETION CRITERIA FOR NATIVE TV

- [ ] Compose TV UI
- [ ] stable D-pad focus
- [ ] real VSMov API
- [ ] native detail
- [ ] native search
- [ ] episode/server model
- [ ] Media3 player where technically compatible
- [ ] playback errors handled
- [ ] app lifecycle handled
- [ ] tested on emulator/device


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


At the end:
1. state which TV architecture was chosen
2. explain why
3. list code/files changed
4. describe remote/focus behavior
5. describe playback compatibility
6. list tests run
7. explicitly list remaining TV limitations
