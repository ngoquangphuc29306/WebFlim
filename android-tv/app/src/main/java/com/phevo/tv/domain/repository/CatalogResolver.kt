package com.phevo.tv.domain.repository

enum class CatalogType { SERIES, SINGLE }

data class CatalogFilters(
    val genre: String? = null,
    val country: String? = null,
    val year: Int? = null,
    val type: CatalogType? = null,
    val page: Int = 1,
)

enum class CatalogEndpoint { GENRE, COUNTRY, YEAR, TYPE, DEFAULT }

data class CatalogRequest(
    val endpoint: CatalogEndpoint,
    val slug: String? = null,
    val filters: CatalogFilters,
)

data class CatalogResolution(
    val supported: Boolean,
    val request: CatalogRequest? = null,
    val reason: String? = null,
)

object CatalogResolver {
    fun resolve(filters: CatalogFilters): CatalogResolution {
        val normalized = filters.copy(page = filters.page.coerceAtLeast(1))
        normalized.genre?.takeIf(String::isNotBlank)?.let { genre ->
            return CatalogResolution(true, CatalogRequest(CatalogEndpoint.GENRE, genre, normalized))
        }
        normalized.country?.takeIf(String::isNotBlank)?.let { country ->
            return CatalogResolution(true, CatalogRequest(CatalogEndpoint.COUNTRY, country, normalized))
        }
        normalized.year?.let { year ->
            if (normalized.type != null) {
                return CatalogResolution(
                    supported = false,
                    reason = "Year + type is not directly supported by the current VSMov catalog contract.",
                )
            }
            return CatalogResolution(true, CatalogRequest(CatalogEndpoint.YEAR, year.toString(), normalized))
        }
        normalized.type?.let { type ->
            val slug = if (type == CatalogType.SERIES) "phim-bo" else "phim-le"
            return CatalogResolution(true, CatalogRequest(CatalogEndpoint.TYPE, slug, normalized))
        }
        return CatalogResolution(true, CatalogRequest(CatalogEndpoint.DEFAULT, "phim-moi-cap-nhat", normalized))
    }
}
