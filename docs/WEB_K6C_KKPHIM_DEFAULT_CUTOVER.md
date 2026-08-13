# WEB-K6C — KKPhim default provider cutover

## Scope

KKPhim is now the default movie provider when `PHEVO_MOVIE_PROVIDER` is absent, empty, or invalid. The provider-neutral `MovieProvider` boundary remains unchanged.

| `PHEVO_MOVIE_PROVIDER` | Active provider |
| --- | --- |
| absent | KKPhim |
| empty/whitespace | KKPhim |
| `kkphim` (case-insensitive) | KKPhim |
| `vsmov` (case-insensitive) | VSMov |
| any other value | KKPhim |

Normal operation no longer requires a provider environment variable. Set `PHEVO_MOVIE_PROVIDER=vsmov` only for rollback or comparison testing.

## Canary semantics

`PHEVO_MOVIE_PROVIDER_CANARY` remains unchanged and disabled by default. When enabled, the configured provider is primary and the other provider is the shadow provider. With the new default this is:

```text
KKPhim primary → VSMov shadow
```

With an explicit VSMov rollback it becomes:

```text
VSMov primary → KKPhim shadow
```

There is no recursive provider call or same-provider shadow call.

## Preserved contracts

- Routes and `ep`/`server` query parameters are unchanged.
- KKPhim remains the source for catalog, search, Explore filters, detail, episodes, servers, and playback data in default mode.
- TMDB remains metadata/discovery enrichment and is not playback identity.
- Playback identity remains `movieSlug + episodeSlug`.
- VSMov, its adapter, fallback behavior, and explicit rollback remain available.
- No hidden KKPhim → VSMov fallback was introduced for ordinary request failures.

## Validation

Deterministic tests cover absent, empty, invalid, case-normalized, explicit KKPhim, and explicit VSMov values. Manual no-env runtime validation must remove only the current shell override and must not modify `.env.local`; `.env.local` is intentionally outside this phase.

K6R may later retire VSMov after production observation and rollback review. K6C does not remove the provider environment variable, canary, or VSMov implementation.
