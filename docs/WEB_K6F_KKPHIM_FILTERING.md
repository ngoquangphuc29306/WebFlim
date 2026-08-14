# WEB-K6F — KKPhim provider-native advanced filtering

## Scope and invariants

`/kham-pha` now has one public, provider-neutral browse contract. The active provider remains selected by the existing provider configuration; WEB-K6F does not change the default (`vsmov`), remove rollback, change player behavior, or change movie detail/watch routes.

The URL is the source of truth. A user can share or reload a browse URL without client-only filter state.

## Public URL contract

| Public parameter | Accepted values | Notes |
| --- | --- | --- |
| `type` | `phim-le`, `phim-bo`, `tv-shows`, `hoat-hinh` | Legacy `single` and `series` parse as `phim-le` and `phim-bo`; generated URLs are canonical. |
| `genre` | taxonomy slug | Never sent from UI as a provider query name. |
| `country` | taxonomy slug | Never sent from UI as a provider query name. |
| `year` | four-digit release year | Takes priority over a range when both appear in a URL. |
| `yearFrom` + `yearTo` | valid inclusive four-digit range | Both are required and `yearFrom <= yearTo`. |
| `language` | `vietsub`, `thuyet-minh`, `long-tieng` | Capability-gated. |
| `sort` | `updated`, `created`, `year` | Capability-gated. |
| `order` | `asc`, `desc` | Capability-gated. |
| `page` | positive integer | Omitted for page 1. |

Invalid enum values, impossible years, incomplete ranges, and invalid pages are ignored safely. Any change other than pagination resets `page` to `1`.

## Provider boundary

Pages and components use `MovieBrowseFilter` and `MovieProviderCapabilities` through `lib/api/movies.ts`. They do not know upstream query names or endpoint paths.

```text
/kham-pha URL
  → parseMovieBrowseFilter
  → browseMovies(MovieBrowseFilter)
  → active MovieProvider
  → provider adapter query serialization
  → normalized MovieListWithTitleResult
  → Discovery UI
```

The capability model declares whether a provider supports ranges, language, sorting, and a given browse type. Unsupported advanced VSMov requests return a typed `INVALID_REQUEST` result instead of silently dropping the filter. Existing VSMov resolver behavior remains the compatibility path for its supported legacy combinations.

## KKPhim mapping

KKPhim requests use `https://phimapi.com/v1/api/danh-sach` or `/v1/api/danh-sach/{type}`. The adapter maps:

| Normalized field | KKPhim query |
| --- | --- |
| `type` | list path slug |
| `genre` | `category` |
| `country` | `country` |
| `year` | `year` |
| `yearFrom` + `yearTo` | `year=from,to` |
| `language` | `sort_lang` |
| `sort=updated` | `sort_field=modified.time` |
| `sort=created` | `sort_field=_id` |
| `sort=year` | `sort_field=year` |
| `order` | `sort_type` |
| `page`, `limit` | `page`, `limit` |

No request is made per selected filter; one combined provider-native browse request is used.

## Live contract verification (2026-08-13)

The KKPhim official documentation and bounded live requests confirmed these cases:

| Case | Request family | Observed result |
| --- | --- | --- |
| Latest | `danh-sach?page=1` | Success; paginated response. |
| Type + filters | `danh-sach/phim-bo` with category/country/year | Success; all filters retained. |
| Animation + language | `danh-sach/hoat-hinh` + `country=nhat-ban&sort_lang=vietsub` | Success. |
| Thuyết minh | `danh-sach?sort_lang=thuyet-minh` | Success; returned language labels include Thuyết Minh. |
| Lồng tiếng | `danh-sach?sort_lang=long-tieng` | Success; returned language labels include Lồng Tiếng. |
| Year sorting | `danh-sach?sort_field=year&sort_type=asc` | Success; ascending years observed. |
| Year range | `danh-sach?year=2014,2024` | Success; provider echoes range and returns in-range titles. |

The remaining provider combinations are represented by the same normalized contract and are verified by deterministic serialization tests. Live provider responses remain external-state dependent.

## Cache and pagination

The existing provider request cache/revalidation path remains in use. Filter state is encoded in the URL, and the existing pagination component receives the complete canonical base URL, preserving all active filter parameters when changing pages.

## Rollback

Set the existing provider configuration back to `vsmov`. The same route and normalized filter contract remain; unavailable advanced filters are explicitly reported instead of applied partially. No VSMov endpoint or fallback was deleted.

## Tests

- URL parser, legacy aliases, canonical serialization, invalid values, range validation, round-trip parsing, and page reset.
- KKPhim combined-query serialization and one-call adapter integration.
- Capability limitation behavior, so advanced filters are not silently lost on VSMov.

