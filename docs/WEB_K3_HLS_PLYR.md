# WEB-K3 — HLS.js + Plyr playback

## Scope

WEB-K3 adds a provider-neutral direct-HLS playback layer to the existing PHEVO
watch page. It does not change the configured provider, route/query contracts,
Android TV, authentication, Supabase, or playback-progress identity.

The watch page continues to pass normalized episode data to `VideoPlayer`:

```text
MovieProvider adapter
  → EpisodeItemModel.m3u8Url / embedUrl
  → VideoPlayer
```

The player does not inspect VSMov, KKPhim, or PhimAPI DTOs.

## Runtime architecture

```text
normalized m3u8Url
  → native HLS when the browser supports application/vnd.apple.mpegurl
  → HLS.js otherwise, when Hls.isSupported() is true
  → trusted normalized embed fallback when direct HLS cannot be used
  → unavailable state when neither source exists
```

The same `HTMLVideoElement` is used by native HLS, HLS.js, and Plyr. Plyr is
only the control/presentation layer; it does not resolve or extract sources.

Only one playback backend is mounted at a time. Direct HLS mounts the video
host and does not render an iframe. Embed mode disposes the direct video,
Plyr, HLS.js, and listeners before mounting the iframe. Unavailable mode
mounts neither backend.

## Lifecycle and cleanup

`useHlsPlayer` owns HLS attachment, recovery limits, source-generation guards,
and HLS destruction. `usePlyrPlayer` dynamically loads Plyr on the client,
creates at most one Plyr instance for the existing video element, and destroys
it on source change or unmount. The Plyr effect does not depend on changing
playback preferences, so changing speed or volume cannot recreate the player.

The existing source key still remounts the player for a movie, episode, server,
or playback-source change. This preserves the current stale-source protection.

## Controls and capabilities

Plyr provides the direct-player play button, large play button, timeline,
current time, and fullscreen controls. Existing PHEVO controls remain the
owner of quick seek, playback speed, volume/preferences, PiP, reload, theater
mode, and next-episode behavior. Captions and quality controls are not exposed:
the current provider contract does not prove a selectable HLS subtitle track or
reliably expose quality switching metadata through the application contract.

Existing progress and history listeners continue to read the same underlying
video element. Playback identity remains `movieSlug + episodeSlug`.

## Testing

Deterministic unit coverage validates the backend decision order:

1. native HLS;
2. HLS.js;
3. trusted embed;
4. unavailable.

The normal Web quality commands remain:

```text
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

Real provider playback must be verified in a browser with direct HLS-capable
KKPhim/VSMov titles. Headless route tests alone are not evidence of decoded
video/audio, codec support, CORS success, fullscreen, or PiP.

The local Chromium smoke verified the KKPhim HLS.js path with these live
titles: `van-dam-hen-uoc` (full-length), `giang-ho-bangkok` (multi-server
series), and `dragon-ball-daima` (animation). Each reached readyState 4,
reported a finite duration, advanced currentTime, and remained connected to a
Plyr instance. Episode and server switches produced a new blob media source.
The bounded ten-title API sample also returned HLS URLs for all ten sampled
details; it was not treated as proof of playback for every title.

The WEB-K3.1 runtime check also verified one video/zero iframe during direct
playback and after seeking, zero active video elements with one real VSMov
embed source, pause/resume, route exit cleanup, and zero hydration errors on
desktop and mobile viewport loads. Browser autoplay policy required an
explicit Play action in the automated check.

## Known browser limitations

Native HLS availability varies by browser. Chromium uses HLS.js when supported;
Safari/WebKit may use the native branch. If both direct-HLS paths are
unsupported, the player keeps the existing trusted embed fallback and does not
proxy or scrape provider sources. Subtitle tracks are not inferred from a
`Vietsub` server label.
