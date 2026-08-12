package com.phevo.tv.data.repository

import com.phevo.tv.data.remote.vsmov.VsmovClient
import com.phevo.tv.data.remote.vsmov.VsmovConfig
import com.phevo.tv.data.remote.vsmov.dto.VsmovDetailResponseDto
import com.phevo.tv.data.remote.vsmov.mapper.VsmovMapper
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
import com.phevo.tv.domain.repository.CatalogType
import com.phevo.tv.domain.repository.MovieRepository
import java.util.Calendar

class VsmovMovieRepository(
    private val client: VsmovClient = VsmovClient.create(),
) : MovieRepository {
    private val playbackRecovery = VsmovPlaybackRecovery(client::fallbackDetail)
    override suspend fun getLatestMovies(page: Int): DataResult<MoviePage> = mapListResult(
        client.latest(page.safePage()),
        title = "Phim Mới Cập Nhật",
    )

    override suspend fun getMovieListBySlug(slug: String, page: Int): DataResult<MoviePage> {
        val title = listTitles[slug] ?: return DataResult.Failure(
            DataError.InvalidRequest("Unsupported VSMov list slug: $slug"),
        )
        return mapListResult(client.listBySlug(slug, page.safePage()), title)
    }

    override suspend fun getMoviesByGenre(slug: String, page: Int): DataResult<MoviePage> {
        val cleanSlug = slug.trim()
        if (cleanSlug.isEmpty()) return DataResult.Failure(DataError.InvalidRequest("Genre slug must not be blank"))
        return mapListResult(client.byGenre(cleanSlug, page.safePage()), title = "Khám Phá Phim")
    }

    override suspend fun getMoviesByCountry(slug: String, page: Int): DataResult<MoviePage> {
        val cleanSlug = slug.trim()
        if (cleanSlug.isEmpty()) return DataResult.Failure(DataError.InvalidRequest("Country slug must not be blank"))
        return mapListResult(client.byCountry(cleanSlug, page.safePage()), title = "Khám Phá Phim")
    }

    override suspend fun getMoviesByYear(year: Int, page: Int): DataResult<MoviePage> = mapListResult(
        client.byYear(year, page.safePage()),
        title = "Phim Năm $year",
    )

    override suspend fun searchMovies(keyword: String, page: Int): DataResult<MoviePage> {
        val cleanKeyword = keyword.trim()
        if (cleanKeyword.isEmpty()) {
            return DataResult.Success(MoviePage(emptyList(), emptyPagination()))
        }
        return mapListResult(client.search(cleanKeyword, page.safePage()), title = "Kết Quả Tìm Kiếm")
    }

    override suspend fun getGenresList(): DataResult<List<TaxonomyItem>> = when (val result = client.genres()) {
        is VsmovClient.RequestResult.Success -> DataResult.Success(
            result.value.data?.items.orEmpty().mapNotNull(VsmovMapper::mapTaxonomyItem),
        )
        is VsmovClient.RequestResult.Failure -> DataResult.Success(emptyList())
    }

    override suspend fun getCountriesList(): DataResult<List<TaxonomyItem>> = when (val result = client.countries()) {
        is VsmovClient.RequestResult.Success -> {
            val items = result.value.data?.items.orEmpty().mapNotNull(VsmovMapper::mapTaxonomyItem)
            DataResult.Success(if (items.isEmpty()) popularCountries else items)
        }
        is VsmovClient.RequestResult.Failure -> DataResult.Success(popularCountries)
    }

    override suspend fun getYearsList(): DataResult<List<YearOption>> = when (val result = client.years()) {
        is VsmovClient.RequestResult.Success -> {
            val years = result.value.data?.items.orEmpty().mapNotNull(VsmovMapper::mapYear)
                .sortedByDescending { it.year }
            DataResult.Success(years.ifEmpty { VsmovMapper.fallbackYears(currentYear()) })
        }
        is VsmovClient.RequestResult.Failure -> DataResult.Success(VsmovMapper.fallbackYears(currentYear()))
    }

    override suspend fun getMovieDetail(slug: String): DataResult<MovieDetail> {
        val cleanSlug = slug.trim()
        if (cleanSlug.isEmpty()) return DataResult.Failure(DataError.InvalidRequest("Movie slug must not be blank"))

        val primary = client.detail(cleanSlug)
        val primaryResponse = (primary as? VsmovClient.RequestResult.Success)?.value
        val primaryMovie = primaryResponse?.let(VsmovMapper::mapDetail)
        val shouldFallback = primaryResponse == null || needsDetailFallback(primaryResponse)

        if (shouldFallback) {
            val candidates = fallbackCandidates(cleanSlug)
            for (candidate in candidates) {
                when (val fallback = client.fallbackDetail(candidate)) {
                    is VsmovClient.RequestResult.Success -> {
                        val fallbackMovie = fallback.value.takeIf { it.episodes.orEmpty().isNotEmpty() }
                            ?.let(VsmovMapper::mapDetail)
                        if (fallbackMovie != null) return DataResult.Success(fallbackMovie)
                    }
                    is VsmovClient.RequestResult.Failure -> Unit
                }
            }
        }

        if (primaryMovie != null) return DataResult.Success(primaryMovie)
        return DataResult.Failure(primaryError(primary, cleanSlug))
    }

    override suspend fun resolvePlaybackEpisode(detail: MovieDetail, server: Server, episode: Episode): Episode =
        playbackRecovery.resolve(detail, server, episode)

    override suspend fun getCatalogMovies(request: CatalogRequest): DataResult<MoviePage> {
        if (request.endpoint == CatalogEndpoint.YEAR && request.filters.type != null) {
            return DataResult.Failure(
                DataError.InvalidRequest("Year + type is not directly supported by the current VSMov catalog contract"),
            )
        }
        val page = request.filters.page.safePage()
        return when (request.endpoint) {
            CatalogEndpoint.GENRE -> request.slug.cleanSlugOrFailure()?.let { slug -> mapListResult(
                client.byGenre(
                    slug = slug,
                    page = page,
                    country = request.filters.country,
                    year = request.filters.year,
                    type = request.filters.type?.wireValue,
                ),
                title = "Khám Phá Phim",
            ) } ?: invalidCatalogSlug("genre")
            CatalogEndpoint.COUNTRY -> request.slug.cleanSlugOrFailure()?.let { slug -> mapListResult(
                client.byCountry(
                    slug = slug,
                    page = page,
                    year = request.filters.year,
                    type = request.filters.type?.wireValue,
                ),
                title = "Khám Phá Phim",
            ) } ?: invalidCatalogSlug("country")
            CatalogEndpoint.YEAR -> request.slug?.toIntOrNull()?.takeIf { it in 1900..2030 }?.let { year ->
                mapListResult(client.byYear(year, page), title = "Khám Phá Phim")
            } ?: DataResult.Failure(DataError.InvalidRequest("Year slug must be a valid year"))
            CatalogEndpoint.TYPE -> getMovieListBySlug(request.slug.orEmpty(), page)
            CatalogEndpoint.DEFAULT -> getLatestMovies(page)
        }
    }

    private fun mapListResult(
        result: VsmovClient.RequestResult<com.phevo.tv.data.remote.vsmov.dto.VsmovListResponseDto>,
        title: String,
    ): DataResult<MoviePage> = when (result) {
        is VsmovClient.RequestResult.Failure -> DataResult.Failure(result.error)
        is VsmovClient.RequestResult.Success -> {
            val response = result.value
            if (response.items == null) {
                DataResult.Failure(DataError.InvalidResponse("vsmov", "List response is missing items"))
            } else {
                DataResult.Success(VsmovMapper.mapMoviePage(response.items, response.pagination, title))
            }
        }
    }

    private fun needsDetailFallback(response: VsmovDetailResponseDto): Boolean {
        if (response.movie == null) return true
        val firstEpisodeName = response.episodes.orEmpty().firstOrNull()?.episodes.orEmpty()
            .firstOrNull()?.name.orEmpty()
        val firstNumber = Regex("(\\d+)").find(firstEpisodeName)?.groupValues?.getOrNull(1)?.toIntOrNull()
        return firstNumber != null && firstNumber > 20
    }

    private fun fallbackCandidates(slug: String): List<String> = VsmovPlaybackRecovery.fallbackCandidates(slug)

    private fun primaryError(
        primary: VsmovClient.RequestResult<VsmovDetailResponseDto>,
        slug: String,
    ): DataError = when (primary) {
        is VsmovClient.RequestResult.Failure -> primary.error
        is VsmovClient.RequestResult.Success -> DataError.EmptyResponse("${VsmovConfig.VSMOV_BASE_URL}phim/$slug")
    }

    private fun Int.safePage(): Int = coerceAtLeast(1)

    private fun String?.cleanSlugOrFailure(): String? = this?.trim()?.takeIf { it.isNotEmpty() }

    private fun invalidCatalogSlug(kind: String): DataResult<MoviePage> = DataResult.Failure(
        DataError.InvalidRequest("$kind slug must not be blank"),
    )

    private fun emptyPagination() = com.phevo.tv.domain.model.Pagination(0, 24, 1, 1)

    private fun currentYear(): Int = Calendar.getInstance().get(Calendar.YEAR)

    private val CatalogType.wireValue: String
        get() = if (this == CatalogType.SERIES) "series" else "single"

    companion object {
        private val listTitles = mapOf(
            "phim-le" to "Phim Lẻ",
            "phim-bo" to "Phim Bộ",
            "subteam" to "Phim Vietsub Subteam",
            "phim-moi" to "Phim Mới Cập Nhật",
            "phim-moi-cap-nhat" to "Phim Mới Cập Nhật",
            "hoathinh" to "Phim Hoạt Hình",
            "tvshows" to "TV Shows",
        )

        private val popularCountries = listOf(
            TaxonomyItem("han-quoc", "Hàn Quốc", "han-quoc"),
            TaxonomyItem("trung-quoc", "Trung Quốc", "trung-quoc"),
            TaxonomyItem("au-my", "Âu Mỹ", "au-my"),
            TaxonomyItem("nhat-ban", "Nhật Bản", "nhat-ban"),
            TaxonomyItem("viet-nam", "Việt Nam", "viet-nam"),
            TaxonomyItem("thai-lan", "Thái Lan", "thai-lan"),
            TaxonomyItem("hong-kong", "Hong Kong", "hong-kong"),
            TaxonomyItem("dai-loan", "Đài Loan", "dai-loan"),
            TaxonomyItem("an-do", "Ấn Độ", "an-do"),
        )
    }
}
