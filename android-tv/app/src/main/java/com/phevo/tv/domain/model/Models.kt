package com.phevo.tv.domain.model

enum class MovieType {
    MOVIE,
    SERIES,
}

data class MovieCategory(
    val name: String,
    val slug: String?,
)

data class Movie(
    val movieSlug: String,
    val title: String,
    val originalTitle: String? = null,
    val year: Int? = null,
    val type: MovieType,
    val posterToken: String? = null,
    val backdropToken: String? = null,
    val quality: String? = null,
    val episodeLabel: String? = null,
    val rating: Double? = null,
    val status: String? = null,
    val language: String? = null,
    val duration: String? = null,
    val episodeCurrent: String? = null,
    val episodeTotal: String? = null,
    val genres: List<String> = emptyList(),
    val categories: List<MovieCategory> = emptyList(),
    val countries: List<String> = emptyList(),
    val providerType: String? = null,
)

data class Episode(
    val episodeSlug: String,
    val name: String,
    val filename: String? = null,
    val embedUrl: String? = null,
    val m3u8Url: String? = null,
)

data class Server(
    val serverName: String,
    val episodes: List<Episode>,
)

data class MovieDetail(
    val movie: Movie,
    val synopsis: String,
    val genres: List<String> = emptyList(),
    val categories: List<MovieCategory> = emptyList(),
    val countries: List<String> = emptyList(),
    val actors: List<String> = emptyList(),
    val directors: List<String> = emptyList(),
    val servers: List<Server> = emptyList(),
    val relatedMovieSlugs: List<String> = emptyList(),
    val keywords: List<String> = emptyList(),
    val trailerUrl: String? = null,
    val showtimes: String? = null,
    val isCinemaRelease: Boolean = false,
)

data class Pagination(
    val totalItems: Int,
    val totalItemsPerPage: Int,
    val currentPage: Int,
    val totalPages: Int,
)

data class MoviePage(
    val items: List<Movie>,
    val pagination: Pagination,
    val title: String? = null,
)

data class TaxonomyItem(
    val id: String,
    val name: String,
    val slug: String,
)

data class YearOption(
    val id: String,
    val name: String,
    val slug: String,
    val year: Int,
)

data class WatchlistItem(
    val movieSlug: String,
)

data class WatchHistoryItem(
    val movieSlug: String,
    val episodeSlug: String,
    val episodeName: String,
    val progressPercent: Int,
    val updatedAt: Long,
)

data class PlaybackProgress(
    val movieSlug: String,
    val episodeSlug: String,
    val currentTimeSeconds: Long,
    val durationSeconds: Long,
    val completed: Boolean,
)

data class PlayerPreferences(
    val volume: Float = 1f,
    val muted: Boolean = false,
    val playbackRate: Float = 1f,
    val autoplayNextEpisode: Boolean = true,
)

data class HomeContent(
    val heroMovie: Movie,
    val continueWatching: List<Movie>,
    val newMovies: List<Movie>,
    val series: List<Movie>,
    val featuredMovies: List<Movie>,
    val subteamMovies: List<Movie> = emptyList(),
    val animationMovies: List<Movie> = emptyList(),
)

data class PlayerSelection(
    val movieSlug: String,
    val episodeSlug: String? = null,
    val serverIndex: Int? = null,
    val serverName: String? = null,
)

data class LogicalFocusState(
    val selectedItemId: String? = null,
    val selectedItemIndex: Int = 0,
    val restorationKey: String? = null,
)
