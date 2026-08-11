package com.phevo.tv.data.remote.vsmov.mapper

import com.phevo.tv.data.remote.vsmov.VsmovConfig
import com.phevo.tv.data.remote.vsmov.dto.VsmovCategoryDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovDetailResponseDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovEpisodeDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovItemDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovMovieDetailDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovPaginationDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovServerDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovTaxonomyItemDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovCountryDto
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.MoviePage
import com.phevo.tv.domain.model.MovieType
import com.phevo.tv.domain.model.Pagination
import com.phevo.tv.domain.model.Server
import com.phevo.tv.domain.model.TaxonomyItem
import com.phevo.tv.domain.model.YearOption

object VsmovMapper {
    fun imageUrl(value: String?): String? {
        val trimmed = value?.trim().orEmpty()
        if (trimmed.isEmpty()) return null
        if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed
        if (trimmed.startsWith("//")) return "https:$trimmed"
        val origin = VsmovConfig.VSMOV_BASE_URL
            .removeSuffix("api/")
            .removeSuffix("api")
            .trimEnd('/')
        return if (trimmed.startsWith('/')) {
            "$origin$trimmed"
        } else {
            "$origin/$trimmed"
        }
    }

    fun mapMovie(item: VsmovItemDto): Movie? {
        val slug = item.slug?.trim().orEmpty()
        if (slug.isEmpty()) return null
        return Movie(
            movieSlug = slug,
            title = item.name.cleanOrDefault("Chưa có tên"),
            originalTitle = item.originalName.cleanOrNull(),
            year = item.year.toIntOrNullSafe(),
            type = mapMovieType(item.type),
            posterToken = imageUrl(item.thumbUrl ?: item.posterUrl),
            backdropToken = imageUrl(item.posterUrl ?: item.thumbUrl),
            quality = item.quality.cleanOrDefault("HD"),
            episodeLabel = item.episodeCurrent.cleanOrNull() ?: item.episodeTotal.cleanOrNull(),
            rating = parseRating(item.tmdb?.voteAverage),
            status = item.status.cleanOrNull(),
            language = item.lang.cleanOrDefault("Vietsub"),
            duration = item.time.cleanOrNull(),
            episodeCurrent = item.episodeCurrent.cleanOrNull(),
            episodeTotal = item.episodeTotal.cleanOrNull(),
            genres = item.category.orEmpty().mapNotNull(::mapTaxonomyName),
            countries = item.country.orEmpty().mapNotNull(::mapTaxonomyName),
            providerType = item.type.cleanOrNull(),
        )
    }

    fun mapMoviePage(
        items: List<VsmovItemDto>?,
        pagination: VsmovPaginationDto?,
        title: String? = null,
    ): MoviePage {
        val movies = items.orEmpty().mapNotNull(::mapMovie)
        return MoviePage(
            items = movies,
            pagination = mapPagination(pagination, movies.size),
            title = title,
        )
    }

    fun mapDetail(response: VsmovDetailResponseDto): MovieDetail? {
        val movie = response.movie ?: return null
        val baseMovie = mapMovie(movie.toItem()) ?: return null
        return MovieDetail(
            movie = baseMovie,
            synopsis = cleanSynopsis(movie.content),
            genres = movie.category.orEmpty().mapNotNull(::mapTaxonomyName),
            countries = movie.country.orEmpty().mapNotNull(::mapTaxonomyName),
            actors = movie.actor.orEmpty().mapNotNull { it.cleanOrNull() },
            directors = movie.director.orEmpty().mapNotNull { it.cleanOrNull() },
            servers = mapServers(response.episodes),
            keywords = movie.keywords.orEmpty().mapNotNull { it.cleanOrNull() },
            trailerUrl = movie.trailerUrl.cleanOrNull(),
            showtimes = movie.showtimes.cleanOrNull(),
            isCinemaRelease = movie.chieurap == true,
        )
    }

    fun mapServers(servers: List<VsmovServerDto>?): List<Server> = servers.orEmpty().map { server ->
        Server(
            serverName = server.serverName.cleanOrDefault("Server #1").normalizeWhitespace(),
            episodes = sortEpisodes(server.episodes.orEmpty().map(::mapEpisode)),
        )
    }

    fun mapTaxonomyItem(item: VsmovTaxonomyItemDto): TaxonomyItem? {
        val slug = item.slug.cleanOrNull() ?: return null
        return TaxonomyItem(
            id = item.id.cleanOrDefault(slug),
            name = item.name.cleanOrDefault("Chưa phân loại"),
            slug = slug,
        )
    }

    fun mapYear(item: VsmovTaxonomyItemDto): YearOption? {
        val name = item.name.cleanOrNull() ?: item.slug.cleanOrNull() ?: return null
        val year = name.toIntOrNull() ?: return null
        if (year !in 1900..2030) return null
        return YearOption(
            id = item.id.cleanOrDefault(name),
            name = name,
            slug = item.slug.cleanOrDefault(name),
            year = year,
        )
    }

    fun fallbackYears(currentYear: Int): List<YearOption> = (currentYear downTo 2000).map { year ->
        YearOption(year.toString(), year.toString(), year.toString(), year)
    }

    private fun mapEpisode(episode: VsmovEpisodeDto): Episode = Episode(
        episodeSlug = episode.slug.cleanOrDefault("tap-1"),
        name = episode.name.cleanOrDefault(episode.filename.cleanOrDefault("Tập 1")),
        filename = episode.filename.cleanOrNull(),
        embedUrl = episode.embedUrl.cleanOrNull(),
        m3u8Url = episode.m3u8Url.cleanOrNull(),
    )

    private fun sortEpisodes(episodes: List<Episode>): List<Episode> = episodes.sortedWith(
        compareBy<Episode> { extractEpisodeNumber(it.name, it.episodeSlug).isNaN() }
            .thenBy { extractEpisodeNumber(it.name, it.episodeSlug).takeUnless(Double::isNaN) ?: Double.MAX_VALUE }
            .thenBy(String.CASE_INSENSITIVE_ORDER) { it.name },
    )

    private fun extractEpisodeNumber(name: String, slug: String): Double {
        val match = Regex("(\\d+(?:\\.\\d+)?)").find(name) ?: Regex("(\\d+(?:\\.\\d+)?)").find(slug)
        return match?.groupValues?.getOrNull(1)?.toDoubleOrNull() ?: Double.NaN
    }

    private fun mapMovieType(type: String?): MovieType = when (type?.trim()?.lowercase()) {
        "series" -> MovieType.SERIES
        else -> MovieType.MOVIE
    }

    private fun mapTaxonomyName(item: VsmovCategoryDto): String? = item.name.cleanOrNull()

    private fun mapTaxonomyName(item: VsmovCountryDto): String? = item.name.cleanOrNull()

    private fun cleanSynopsis(value: String?): String = value
        .orEmpty()
        .replace(Regex("<[^>]*>"), "")
        .replace("&nbsp;", " ")
        .normalizeWhitespace()
        .ifEmpty { "Nội dung đang được cập nhật..." }

    private fun mapPagination(raw: VsmovPaginationDto?, itemCount: Int): Pagination {
        val currentPage = raw?.currentPage.toIntOrNullSafe()?.coerceAtLeast(1) ?: 1
        val perPage = raw?.totalItemsPerPage.toIntOrNullSafe()?.coerceAtLeast(1) ?: 24
        val totalItems = raw?.totalItems.toIntOrNullSafe()?.coerceAtLeast(0) ?: itemCount
        val totalPages = raw?.totalPages.toIntOrNullSafe()?.coerceAtLeast(1)
            ?: maxOf(1, (totalItems + perPage - 1) / perPage)
        return Pagination(totalItems, perPage, currentPage, totalPages)
    }

    private fun VsmovMovieDetailDto.toItem() = VsmovItemDto(
        id = id,
        name = name,
        originalName = originalName,
        slug = slug,
        posterUrl = posterUrl,
        thumbUrl = thumbUrl,
        year = year,
        type = type,
        status = status,
        quality = quality,
        lang = lang,
        episodeCurrent = episodeCurrent,
        episodeTotal = episodeTotal,
        time = time,
        view = view,
        tmdb = tmdb,
        category = category,
        country = country,
    )

    private fun parseRating(value: String?): Double? = value?.toDoubleOrNull()
        ?.takeIf { it > 0 }
        ?.let { kotlin.math.round(it * 10) / 10 }

    private fun String?.cleanOrNull(): String? = this?.trim()?.takeIf { it.isNotEmpty() }

    private fun String?.cleanOrDefault(default: String): String = cleanOrNull() ?: default

    private fun String?.toIntOrNullSafe(): Int? = cleanOrNull()?.toIntOrNull()

    private fun String.normalizeWhitespace(): String = replace(Regex("\\s+"), " ").trim()
}
