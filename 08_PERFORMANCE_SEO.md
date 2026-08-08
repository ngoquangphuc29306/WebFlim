# PHASE 08 — PERFORMANCE, SEO, ACCESSIBILITY & PRODUCTION HARDENING

Read `docs/MASTER_SPEC.md` first.

Your task is optimization/hardening of the existing complete web product.

Do not redesign working pages.

## GOAL

Improve:
- runtime performance
- loading experience
- image performance
- caching
- SEO metadata
- accessibility
- production resilience

Measure/inspect first where possible. Do not blindly optimize.

## 1. SERVER / CLIENT BOUNDARIES

Audit Client Components.

For every `"use client"`:
- is it actually necessary?
- can data fetching move to server?
- can interaction be isolated to a smaller child?

Do not move everything client-side.

## 2. DATA FETCHING

Audit:
- duplicated API calls
- sequential requests that can safely be parallel
- unnecessarily uncached requests
- stale search handling
- failure behavior

Choose sensible `revalidate` policies for movie lists/details.

Search should remain appropriately dynamic.

Do not cache user-specific localStorage state server-side.

## 3. IMAGE PERFORMANCE

Audit all movie images:
- `next/image`
- correct `sizes`
- correct dimensions/aspect ratio
- hero priority only when needed
- lazy load below fold
- no massive original image rendered for tiny card
- correct remotePatterns
- fallback behavior

Avoid setting every poster `priority`.

## 4. LAYOUT SHIFT

Check:
- hero
- cards
- rail heights
- fonts
- badges
- player
- skeletons

Reserve dimensions before assets load.

## 5. JAVASCRIPT BUDGET

Remove:
- unnecessary client state
- duplicated libraries
- unused dependencies/components
- overcomplicated animation

Do not remove a dependency merely for aesthetics if it is legitimately needed.

## 6. SEO

Implement/audit:
- root metadata
- `generateMetadata` for movie details
- metadata for browse pages
- Open Graph
- meaningful descriptions
- canonical behavior if relevant
- sitemap/robots only if appropriate for deployment stage

Movie page title example concept:

```text
{Movie Name} ({Year}) | {Brand}
```

Do not keyword stuff.

## 7. SEMANTIC HTML

Audit:
- `main`
- `nav`
- headings
- buttons vs links
- lists/sections where semantic
- accessible labels

Do not make clickable `div`s when buttons/links are correct.

## 8. KEYBOARD ACCESSIBILITY

Test:
- Header
- Search
- Movie cards
- Movie rail controls
- Detail CTA
- Episode buttons
- Server selector
- Pagination
- Mobile menu/dialog
- player-adjacent controls

Focus must be visible on dark surfaces.

## 9. CONTRAST

Inspect:
- secondary metadata
- hero overlays
- badge text
- disabled states
- focus outlines

Do not make metadata so muted that it becomes unreadable.

## 10. REDUCED MOTION

Support users who request reduced motion.

Hover scale should not be essential to understanding state.

## 11. ERROR HARDENING

Audit:
- API down
- timeout/network error
- invalid movie slug
- missing poster
- empty episodes
- playback unavailable
- malformed query params
- missing pagination data

No raw runtime exception should become the normal user experience.

## 12. BUILD CONFIG

Check:
- environment variables
- Next.js image config
- production build warnings
- dead imports
- console noise
- server/client mistakes

Do not expose secrets to browser bundles.

VSMov public base URL is not itself a secret.

## 13. OPTIONAL OBSERVABILITY

If the project already has monitoring/logging:
- integrate errors sensibly

Do not introduce a third-party analytics stack without instruction.

## COMPLETION CHECKLIST

- [ ] Client components minimized
- [ ] Duplicate API calls reduced
- [ ] Caching intentional
- [ ] Image sizes optimized
- [ ] CLS risks reduced
- [ ] SEO metadata complete
- [ ] Semantic HTML good
- [ ] Keyboard navigation good
- [ ] Contrast/focus good
- [ ] Reduced motion respected
- [ ] API/player error cases hardened
- [ ] production build clean


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


At the end provide:
1. performance findings
2. changes made
3. SEO changes
4. accessibility changes
5. errors/warnings remaining
6. exact checks run

Do not start Phase 09.
