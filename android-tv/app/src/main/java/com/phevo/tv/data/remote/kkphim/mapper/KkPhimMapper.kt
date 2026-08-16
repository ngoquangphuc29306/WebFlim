package com.phevo.tv.data.remote.kkphim.mapper

import com.phevo.tv.data.remote.kkphim.KkPhimConfig
import com.phevo.tv.data.remote.kkphim.dto.KkPhimDetailItemDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimDetailResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimEpisodeDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimItemDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimListResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimServerDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimTaxonomyDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimYearDto
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieCategory
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.MoviePage
import com.phevo.tv.domain.model.MovieType
import com.phevo.tv.domain.model.Pagination
import com.phevo.tv.domain.model.Server
import com.phevo.tv.domain.model.TaxonomyItem
import com.phevo.tv.domain.model.YearOption

object KkPhimMapper {
    fun mapMovie(item: KkPhimItemDto, cdn: String? = null): Movie? = mapMovieFields(
        slug = item.slug,
        title = item.name,
        originalTitle = item.originalName,
        poster = item.posterUrl,
        thumb = item.thumbUrl,
        year = item.year,
        type = item.type,
        status = item.status,
        quality = item.quality,
        language = item.lang,
        episodeCurrent = item.episodeCurrent,
        episodeTotal = item.episodeTotal,
        duration = item.time,
        rating = item.tmdb?.voteAverage,
        categories = item.category,
        countries = item.country,
        cdn = cdn,
    )

    fun mapDetail(response: KkPhimDetailResponseDto): MovieDetail? {
        val data = response.data ?: return null
        val item = data.item ?: return null
        val movie = mapDetailMovie(item, data.imageCdn) ?: return null
        return MovieDetail(
            movie = movie,
            synopsis = cleanHtml(item.content).orEmpty(),
            genres = item.category.orEmpty().mapNotNull { it.name.clean() },
            categories = item.category.orEmpty().mapNotNull(::mapCategory),
            countries = item.country.orEmpty().mapNotNull { it.name.clean() },
            actors = item.actor.orEmpty().mapNotNull { it.clean() },
            directors = item.director.orEmpty().mapNotNull { it.clean() },
            servers = mapServers(item.episodes),
            relatedMovieSlugs = emptyList(),
            keywords = emptyList(),
            trailerUrl = item.trailerUrl.httpUrlOrNull(),
            showtimes = item.showtimes.clean(),
            isCinemaRelease = item.chieurap == true,
        )
    }

    fun mapServers(servers: List<KkPhimServerDto>?): List<Server> = servers.orEmpty().mapIndexed { index, server ->
        Server(
            serverName = server.serverName.clean() ?: "Server #${index + 1}",
            episodes = server.episodes.orEmpty().mapNotNull(::mapEpisode),
        )
    }

    fun mapEpisode(episode: KkPhimEpisodeDto): Episode? {
        val slug = episode.slug.clean() ?: return null
        val name = episode.name.clean() ?: episode.filename.clean() ?: return null
        return Episode(
            episodeSlug = slug,
            name = name,
            filename = episode.filename.clean(),
            embedUrl = episode.embedUrl.httpUrlOrNull(),
            m3u8Url = episode.m3u8Url.httpUrlOrNull(),
        )
    }

    fun mapPagination(response: KkPhimListResponseDto, itemCount: Int = response.data?.items.orEmpty().size): Pagination {
        val raw = response.data?.params?.pagination
        val totalItems = raw?.totalItems.toIntOrDefault(0)
        val itemsPerPage = raw?.totalItemsPerPage.toIntOrDefault(KkPhimConfig.DEFAULT_PAGE_SIZE).coerceAtLeast(1)
        val currentPage = raw?.currentPage.toIntOrDefault(1).coerceAtLeast(1)
        val directTotalPages = raw?.totalPages.toIntOrDefault(0)
        val totalPages = when {
            directTotalPages > 0 -> directTotalPages
            totalItems > 0 -> ((totalItems + itemsPerPage - 1) / itemsPerPage).coerceAtLeast(1)
            itemCount > 0 -> 1
            else -> 1
        }
        return Pagination(totalItems, itemsPerPage, currentPage, totalPages)
    }

    fun mapList(response: KkPhimListResponseDto, title: String? = null): MoviePage {
        val data = response.data
        return MoviePage(
        items = data?.items.orEmpty().mapNotNull { mapMovie(it, data?.imageCdn) },
        pagination = mapPagination(response),
        title = title,
        )
    }

    fun mapTaxonomy(item: KkPhimTaxonomyDto): TaxonomyItem? {
        val slug = item.slug.clean() ?: return null
        val name = item.name.clean() ?: return null
        return TaxonomyItem(item.id.clean() ?: item.legacyId.clean() ?: slug, name, slug)
    }

    fun mapYear(item: KkPhimYearDto): YearOption? {
        val rawYear = item.year.clean() ?: item.name.clean() ?: item.slug.clean() ?: return null
        val year = rawYear.toIntOrNull()?.takeIf { it >= 1900 } ?: return null
        val slug = item.slug.clean() ?: year.toString()
        return YearOption(item.id.clean() ?: item.legacyId.clean() ?: slug, item.name.clean() ?: year.toString(), slug, year)
    }

    fun normalizeImage(value: String?, cdn: String? = null): String? {
        val image = value.clean() ?: return null
        if (image.startsWith("http://", ignoreCase = true) || image.startsWith("https://", ignoreCase = true)) return image
        val normalizedCdn = (cdn.clean() ?: KkPhimConfig.IMAGE_CDN_BASE_URL).removeSuffix("/")
        return if (image.startsWith("//")) "https:${image}" else "$normalizedCdn/${image.removePrefix("/")}"
    }

    private fun mapDetailMovie(item: KkPhimDetailItemDto, cdn: String?): Movie? = mapMovieFields(
        slug = item.slug,
        title = item.name,
        originalTitle = item.originalName,
        poster = item.posterUrl,
        thumb = item.thumbUrl,
        year = item.year,
        type = item.type,
        status = item.status,
        quality = item.quality,
        language = item.lang,
        episodeCurrent = item.episodeCurrent,
        episodeTotal = item.episodeTotal,
        duration = item.time,
        rating = item.tmdb?.voteAverage,
        categories = item.category,
        countries = item.country,
        cdn = cdn,
    )

    private fun mapMovieFields(
        slug: String?,
        title: String?,
        originalTitle: String?,
        poster: String?,
        thumb: String?,
        year: String?,
        type: String?,
        status: String?,
        quality: String?,
        language: String?,
        episodeCurrent: String?,
        episodeTotal: String?,
        duration: String?,
        rating: String?,
        categories: List<KkPhimTaxonomyDto>?,
        countries: List<KkPhimTaxonomyDto>?,
        cdn: String?,
    ): Movie? {
        val movieSlug = slug.clean() ?: return null
        val movieTitle = title.clean() ?: return null
        return Movie(
            movieSlug = movieSlug,
            title = movieTitle,
            originalTitle = originalTitle.clean(),
            year = year?.toIntOrNull(),
            type = if (type.clean()?.equals("series", ignoreCase = true) == true) MovieType.SERIES else MovieType.MOVIE,
            posterToken = normalizeImage(poster, cdn) ?: normalizeImage(thumb, cdn),
            backdropToken = normalizeImage(thumb, cdn) ?: normalizeImage(poster, cdn),
            quality = quality.clean(),
            episodeLabel = episodeCurrent.clean(),
            rating = rating?.toDoubleOrNull()?.takeIf { it.isFinite() },
            status = status.clean(),
            language = language.clean(),
            duration = duration.clean(),
            episodeCurrent = episodeCurrent.clean(),
            episodeTotal = episodeTotal.clean(),
            genres = categories.orEmpty().mapNotNull { it.name.clean() },
            categories = categories.orEmpty().mapNotNull(::mapCategory),
            countries = countries.orEmpty().mapNotNull { it.name.clean() },
            providerType = type.clean(),
        )
    }

    private fun mapCategory(item: KkPhimTaxonomyDto): MovieCategory? {
        val name = item.name.clean() ?: return null
        return MovieCategory(name, item.slug.clean())
    }

    private fun cleanHtml(value: String?): String? = value.clean()
        ?.replace(Regex("<[^>]*>"), "")
        ?.replace("&nbsp;", " ")
        ?.replace(Regex("\\s+"), " ")
        ?.trim()
        ?.takeIf(String::isNotEmpty)

    private fun String?.clean(): String? = this?.trim()?.takeIf(String::isNotEmpty)

    private fun String?.httpUrlOrNull(): String? = clean()?.takeIf {
        it.startsWith("http://", ignoreCase = true) || it.startsWith("https://", ignoreCase = true)
    }

    private fun String?.toIntOrDefault(default: Int): Int = clean()?.toIntOrNull() ?: default
}
