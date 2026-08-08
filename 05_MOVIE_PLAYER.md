# PHASE 05 — WATCH PAGE, PLAYER, EPISODES & SERVERS

Read `docs/MASTER_SPEC.md` first.

Your task is ONLY the watch experience.

Route:

```text
/xem-phim/[slug]
```

Use existing movie detail/episode data.

## GOAL

Create a stable, distraction-minimized watching experience using ONLY legitimate playback sources returned by VSMov.

The player is the primary element on this page.

## FIRST — VERIFY PLAYBACK DATA

Before coding the player:
1. inspect the actual normalized/detail episode data
2. identify server structure
3. identify episode identifiers/names/slugs
4. identify actual playback URL fields
5. identify whether sources are embed URLs, HLS/M3U8 URLs, or other
6. verify nullable/unavailable cases

Do not fabricate URLs.

Do not scrape other movie sites.

Do not proxy streams through the application unless there is a legitimate technical requirement and the source terms permit it.

## URL STATE

Prefer URL-backed selection.

Example concept:

```text
/xem-phim/movie-slug?episode=2&server=server-name
```

Use query names that fit the actual data model.

On page load:
- validate requested episode/server
- if invalid, fall back predictably to the first valid option
- avoid infinite redirects

## PLAYER CONTAINER

Player:
- 16:9
- black background
- centered
- desktop max width roughly 1200–1440px
- full width on mobile

Never use a fixed desktop pixel height on mobile.

## PLAYBACK STRATEGY

If the API provides an embeddable URL:
- render a carefully configured iframe
- use safe `allow` attributes
- use title
- set appropriate fullscreen support

If the project uses direct HLS/M3U8 and a player implementation is required:
- first inspect browser compatibility and existing dependencies
- choose the minimal reliable implementation
- do not install a large player package unnecessarily

Do not assume all sources work identically.

## PLAYER STATES

Required:
- loading
- ready
- unavailable
- source/server failure
- no playable source

Unavailable example:

```text
Không thể phát nguồn này.
[Thử lại] [Chọn server khác]
```

Do not leave users with a blank black rectangle.

## SERVER SELECTOR

If multiple servers exist:
- clear labels
- selected state
- switching server updates URL/state
- switching should preserve current episode
- keyboard accessible

## EPISODE SELECTOR

Series:
- episode buttons
- current episode clear
- large enough click targets
- useful for many episodes

Provide:
```text
Tập trước
Tập tiếp
```

only when those episodes exist.

Selecting episode should preserve a compatible server when possible, otherwise choose a valid default.

## WATCH PAGE CONTENT

Recommended:

```text
Header
Player
Movie title + current episode
Server selector
Episode selector
Previous / Next
Compact movie description/info
Related movie row
Footer optional/minimal
```

Do not put a giant detail-page hero above the player.

## WATCH HISTORY

If local watch history is part of the product:
store minimally:
- slug
- episode identifier
- server identifier
- last watched timestamp

If actual playback position can be reliably observed, it may be stored.

Do not show fake progress bars based only on opening the page.

## KEYBOARD

Web desktop:
- normal tab focus
- Enter/Space activates buttons
- Escape where dialogs are used

Do not implement Android-TV-specific D-pad orchestration yet.

## MOBILE

- 16:9 player
- controls/selectors under player
- no horizontal body overflow
- large episode targets
- avoid sticky UI that covers the video

## SECURITY

Treat external playback URLs as untrusted input.

Do not inject arbitrary HTML.

Avoid `dangerouslySetInnerHTML`.

If iframe is used, apply the safest practical policy compatible with actual playback.

## NON-GOALS

- no Android TV Media3 yet
- no DRM reverse engineering
- no stream downloading
- no stream scraping
- no custom backend proxy unless explicitly justified
- no redesign of detail/home

## COMPLETION CHECKLIST

- [ ] Real episode/server data
- [ ] Real playback source
- [ ] 16:9 responsive player
- [ ] URL-backed episode/server state
- [ ] Server switch
- [ ] Episode switch
- [ ] Previous/Next
- [ ] Loading/error/no-source states
- [ ] No fake URLs
- [ ] Mobile usable
- [ ] Keyboard accessible
- [ ] Existing web still builds


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
1. actual playback fields used
2. player strategy chosen and why
3. URL state format
4. fallback logic
5. files changed
6. checks run

Do not start Phase 06.
