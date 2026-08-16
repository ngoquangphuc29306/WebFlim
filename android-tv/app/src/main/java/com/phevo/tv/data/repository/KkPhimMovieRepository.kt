package com.phevo.tv.data.repository

import com.phevo.tv.data.remote.kkphim.KkPhimClient
import com.phevo.tv.data.remote.kkphim.KkPhimConfig
import com.phevo.tv.data.remote.kkphim.dto.KkPhimListResponseDto
import com.phevo.tv.data.remote.kkphim.mapper.KkPhimMapper
import com.phevo.tv.domain.model.DataError
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.MoviePage
import com.phevo.tv.domain.model.Server
import com.phevo.tv.domain.model.TaxonomyItem
import com.phevo.tv.domain.model.YearOption
import com.phevo.tv.domain.repository.CatalogEndpoint
import com.phevo.tv.domain.repository.CatalogRequest
import com.phevo.tv.domain.repository.MovieRepository
import java.util.Calendar

class KkPhimMovieRepository(
    private val client: KkPhimClient = KkPhimClient.create(),
) : MovieRepository {
    override suspend fun getLatestMovies(page: Int): DataResult<MoviePage> = mapListResult(
        client.latest(page.safePage()),
        "Phim Mới Cập Nhật",
    )

    override suspend fun getMovieListBySlug(slug: String, page: Int): DataResult<MoviePage> {
        val requested = slug.trim()
        if (requested.isEmpty()) return invalid("Movie list slug must not be blank")
        if (requested == "phim-moi" || requested == "phim-moi-cap-nhat") return getLatestMovies(page)
        val type = TYPE_ALIASES[requested] ?: return invalid("Unsupported KKPhim list slug: $requested")
        return mapListResult(client.listByType(type, page.safePage()), titleFor(requested))
    }

    override suspend fun getMoviesByGenre(slug: String, page: Int): DataResult<MoviePage> {
        val requested = slug.trim()
        if (requested.isEmpty()) return invalid("Genre slug must not be blank")
        return mapListResult(client.byGenre(requested, page.safePage()), "Khám Phá Phim")
    }

    override suspend fun getMoviesByCountry(slug: String, page: Int): DataResult<MoviePage> {
        val requested = slug.trim()
        if (requested.isEmpty()) return invalid("Country slug must not be blank")
        return mapListResult(client.byCountry(requested, page.safePage()), "Khám Phá Phim")
    }

    override suspend fun getMoviesByYear(year: Int, page: Int): DataResult<MoviePage> {
        if (year !in 1900..(currentYear() + 1)) return invalid("Year must be valid")
        return mapListResult(client.byYear(year, page.safePage()), "Phim Năm $year")
    }

    override suspend fun searchMovies(keyword: String, page: Int): DataResult<MoviePage> {
        val requested = keyword.trim()
        if (requested.isEmpty()) return DataResult.Success(MoviePage(emptyList(), emptyPagination()))
        return mapListResult(client.search(requested, page.safePage()), "Kết Quả Tìm Kiếm")
    }

    override suspend fun getGenresList(): DataResult<List<TaxonomyItem>> = when (val result = client.genres()) {
        is KkPhimClient.RequestResult.Failure -> DataResult.Failure(result.error)
        is KkPhimClient.RequestResult.Success -> DataResult.Success(
            result.value.data?.items.orEmpty().mapNotNull(KkPhimMapper::mapTaxonomy),
        )
    }

    override suspend fun getCountriesList(): DataResult<List<TaxonomyItem>> = when (val result = client.countries()) {
        is KkPhimClient.RequestResult.Failure -> DataResult.Failure(result.error)
        is KkPhimClient.RequestResult.Success -> DataResult.Success(
            result.value.data?.items.orEmpty().mapNotNull(KkPhimMapper::mapTaxonomy),
        )
    }

    override suspend fun getYearsList(): DataResult<List<YearOption>> = when (val result = client.years()) {
        is KkPhimClient.RequestResult.Failure -> DataResult.Failure(result.error)
        is KkPhimClient.RequestResult.Success -> DataResult.Success(
            result.value.data?.items.orEmpty().mapNotNull(KkPhimMapper::mapYear).sortedByDescending { it.year },
        )
    }

    override suspend fun getMovieDetail(slug: String): DataResult<MovieDetail> {
        val requested = slug.trim()
        if (requested.isEmpty()) return invalid("Movie slug must not be blank")
        return when (val result = client.detail(requested)) {
            is KkPhimClient.RequestResult.Failure -> DataResult.Failure(result.error)
            is KkPhimClient.RequestResult.Success -> {
                val detail = KkPhimMapper.mapDetail(result.value)
                if (detail == null) {
                    DataResult.Failure(DataError.InvalidResponse(detailUrl(requested), "KKPhim detail is missing a valid item"))
                } else {
                    DataResult.Success(detail)
                }
            }
        }
    }

    /** Returns the matching episode or the first target-server episode when the slug is absent. */
    fun resolveEpisodeOrNull(server: Server, requested: Episode): Episode? = when {
        server.episodes.isEmpty() -> null
        else -> server.episodes.firstOrNull { it.episodeSlug == requested.episodeSlug } ?: server.episodes.firstOrNull()
    }

    override suspend fun resolvePlaybackEpisode(detail: MovieDetail, server: Server, episode: Episode): Episode =
        resolveEpisodeOrNull(server, episode) ?: episode.copy(embedUrl = null, m3u8Url = null)

    override suspend fun getCatalogMovies(request: CatalogRequest): DataResult<MoviePage> {
        val page = request.filters.page.safePage()
        val slug = request.slug?.trim().orEmpty()
        return when (request.endpoint) {
            CatalogEndpoint.GENRE -> if (slug.isEmpty()) invalid("Genre slug must not be blank") else if (request.filters.type != null) {
                invalid("KKPhim does not expose genre + type through this repository contract")
            } else {
                mapListResult(
                    client.byGenre(slug, page, request.filters.country, request.filters.year),
                    "Khám Phá Phim",
                )
            }
            CatalogEndpoint.COUNTRY -> if (slug.isEmpty()) invalid("Country slug must not be blank") else if (request.filters.type != null) {
                invalid("KKPhim does not expose country + type through this repository contract")
            } else {
                mapListResult(client.byCountry(slug, page, request.filters.year), "Khám Phá Phim")
            }
            CatalogEndpoint.YEAR -> slug.toIntOrNull()?.let { year ->
                if (request.filters.type != null) invalid("KKPhim does not expose year + type through this repository contract")
                else getMoviesByYear(year, page)
            } ?: invalid("Year slug must be a valid year")
            CatalogEndpoint.TYPE -> getMovieListBySlug(slug, page)
            CatalogEndpoint.DEFAULT -> getLatestMovies(page)
        }
    }

    private fun mapListResult(
        result: KkPhimClient.RequestResult<KkPhimListResponseDto>,
        title: String,
    ): DataResult<MoviePage> = when (result) {
        is KkPhimClient.RequestResult.Failure -> DataResult.Failure(result.error)
        is KkPhimClient.RequestResult.Success -> {
            if (result.value.data == null) {
                DataResult.Failure(DataError.EmptyResponse("${KkPhimConfig.BASE_URL.removeSuffix("/")}/v1/api/danh-sach"))
            } else {
                DataResult.Success(KkPhimMapper.mapList(result.value, title))
            }
        }
    }

    private fun invalid(reason: String): DataResult.Failure = DataResult.Failure(DataError.InvalidRequest(reason))

    private fun detailUrl(slug: String): String = "${KkPhimConfig.BASE_URL.removeSuffix("/")}/v1/api/phim/$slug"

    private fun emptyPagination() = com.phevo.tv.domain.model.Pagination(
        totalItems = 0,
        totalItemsPerPage = com.phevo.tv.data.remote.kkphim.KkPhimConfig.DEFAULT_PAGE_SIZE,
        currentPage = 1,
        totalPages = 1,
    )

    private fun Int.safePage(): Int = coerceAtLeast(1)

    private fun currentYear(): Int = Calendar.getInstance().get(Calendar.YEAR)

    private fun titleFor(slug: String): String = TITLES[slug] ?: "Danh sách phim"

    companion object {
        private val TYPE_ALIASES = mapOf(
            "phim-le" to "phim-le",
            "phim-bo" to "phim-bo",
            "hoathinh" to "hoat-hinh",
            "hoat-hinh" to "hoat-hinh",
            "tvshows" to "tv-shows",
            "tv-shows" to "tv-shows",
            "phim-chieu-rap" to "phim-chieu-rap",
        )

        private val TITLES = mapOf(
            "phim-le" to "Phim Lẻ",
            "phim-bo" to "Phim Bộ",
            "hoathinh" to "Phim Hoạt Hình",
            "hoat-hinh" to "Phim Hoạt Hình",
            "tvshows" to "TV Shows",
            "tv-shows" to "TV Shows",
            "phim-chieu-rap" to "Phim Chiếu Rạp",
            "phim-moi" to "Phim Mới Cập Nhật",
            "phim-moi-cap-nhat" to "Phim Mới Cập Nhật",
        )
    }
}
