# VSMov API Architecture & Integration Specification

This document details the architecture, types, client service layer, data normalization flow, caching policies, and error handling for the VSMov streaming API integration.

---

## 1. API Overview

- **Base URL**: `https://vsmov.com/api`
- **Protocol**: HTTPS GET
- **Authentication**: None required (Public API)
- **Response Format**: JSON
- **Header Requirements**: `Accept: application/json`, standard `User-Agent`

---

## 2. Endpoints Verified & Integrated

| Endpoint | Purpose | Cache Revalidate | Return Model |
| :--- | :--- | :--- | :--- |
| `GET /api/danh-sach/phim-moi-cap-nhat?page={page}` | Latest updated movies | 60 seconds | `VSMovListResponse` |
| `GET /api/danh-sach/{slug}?page={page}` | Preset movie list (phim-le, phim-bo, subteam, hoathinh, tvshows) | 180 seconds | `VSMovListResponse` |
| `GET /api/tim-kiem?keyword={keyword}&page={page}` | Keyword search | 60 seconds | `VSMovListResponse` |
| `GET /api/phim/{slug}` | Movie details & episode servers | 60 seconds | `VSMovDetailResponse` |
| `GET /api/the-loai/{slug}?page={page}` | Filter movies by genre | 300 seconds | `VSMovListResponse` |
| `GET /api/quoc-gia/{slug}?page={page}` | Filter movies by country | 300 seconds | `VSMovListResponse` |
| `GET /api/nam/{year}?page={page}` | Filter movies by release year | 300 seconds | `VSMovListResponse` |
| `GET /api/the-loai` | All genres taxonomy list | 86400 seconds (24h) | `VSMovTaxonomyResponse` |
| `GET /api/quoc-gia` | All countries taxonomy list | 86400 seconds (24h) | `VSMovTaxonomyResponse` |

---

## 3. Response Conventions & Findings

### 3.1 List Response Envelope (`VSMovListResponse`)
```json
{
  "status": true,
  "items": [
    {
      "_id": "...",
      "name": "Movie Title",
      "origin_name": "Original Title",
      "slug": "movie-slug",
      "poster_url": "https://vsmov.com/storage/images/...",
      "thumb_url": "https://vsmov.com/storage/images/...",
      "year": 2024,
      "type": "single",
      "status": "completed",
      "quality": "HD",
      "lang": "Vietsub",
      "episode_current": "Full",
      "episode_total": "1",
      "time": "120 phút",
      "view": 1500,
      "category": [{ "id": 30, "name": "Hành Động", "slug": "hanh-dong" }],
      "country": [{ "id": 7, "name": "Âu Mỹ", "slug": "au-my" }]
    }
  ],
  "pagination": {
    "totalItems": 18173,
    "totalItemsPerPage": 24,
    "currentPage": 1,
    "totalPages": 758
  }
}
```

### 3.2 Detail Response Envelope (`VSMovDetailResponse`)
```json
{
  "status": true,
  "msg": "Success",
  "movie": {
    "_id": "...",
    "name": "...",
    "origin_name": "...",
    "slug": "...",
    "content": "<p>Movie description...</p>",
    "director": ["Director Name"],
    "actor": ["Actor Name 1", "Actor Name 2"],
    "category": [{ "id": 23, "name": "Phiêu Lưu", "slug": "phieu-luu" }],
    "country": [{ "id": 7, "name": "Âu Mỹ", "slug": "au-my" }]
  },
  "episodes": [
    {
      "server_name": "Vietsub                        #1",
      "server_data": [
        {
          "name": "Full",
          "slug": "tap-full",
          "filename": "Full",
          "link_embed": "https://v6.streamvsmov.com/video/..."
        }
      ]
    }
  ]
}
```

---

## 4. Architecture Flow

```text
Next.js Server Component / API Route
           │
           ▼
     lib/api/vsmov.ts
  (API Client Service)
           │
           ▼
 lib/api/normalizers.ts
(Data Mapper & Cleaner)
           │
           ▼
     UI Components
(Consumes MovieCardModel, MovieDetailModel, ServerGroupModel)
```

### 4.1 UI Domain Models
The application presentation components only consume predictable UI domain models (`MovieCardModel`, `MovieDetailModel`, `ServerGroupModel`) defined in `types/movie.ts`, decoupling UI code from raw API field changes.

---

## 5. Error & Fallback Model

1. **Network Errors**: Caught gracefully; returns default empty datasets with `error` metadata instead of throwing runtime exceptions.
2. **HTTP Errors (e.g. 404, 500)**: Logged server-side and mapped to structured `VSMovApiError` objects (`NOT_FOUND` or `HTTP_ERROR`).
3. **Invalid JSON / Malformed Payload**: Checked via `Content-Type` headers and array checks before processing.
4. **HTML Content Sanitization**: Detail `content` field containing raw HTML tags is sanitized and stripped of HTML tags/entities before sending to the client UI.
5. **Image Fallbacks**: Relative poster/thumb paths are converted to absolute URLs (`https://vsmov.com/storage/...`). Missing image fields fall back gracefully to a high-quality placeholder asset.

---

## 6. Remote Image Patterns

Configured in `next.config.ts`:
- `vsmov.com`
- `*.vsmov.com`
- `image.tmdb.org`
- `img.youtube.com`
- `picsum.photos` (for fallback placeholders)

---

## 7. Technical Risks & Limitations

- **Whitespace in Server Names**: Raw `server_name` string contains multiple trailing tabs/spaces (e.g., `"Vietsub                        #1"`). The normalizer cleans this to `"Vietsub #1"`.
- **Embed URL vs Direct Stream**: VSMov provides `link_embed` (iframe player link). Some items may optionally have `link_m3u8` when direct HLS is supported. The player layer handles embed iframe loading securely.
- **Optional TMDB Data**: TMDB vote averages and IDs are present on many items but not guaranteed. Ratings default to undefined when absent.
