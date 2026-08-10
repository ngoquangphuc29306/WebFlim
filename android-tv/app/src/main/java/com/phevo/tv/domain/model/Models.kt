package com.phevo.tv.domain.model

enum class MovieType {
    MOVIE,
    SERIES,
}

data class Movie(
    val movieSlug: String,
    val title: String,
    val originalTitle: String? = null,
    val year: Int,
    val type: MovieType,
    val posterToken: String? = null,
    val backdropToken: String? = null,
    val quality: String? = null,
    val episodeLabel: String? = null,
    val rating: Double? = null,
)

data class Episode(
    val episodeSlug: String,
    val name: String,
)

data class Server(
    val serverName: String,
    val episodes: List<Episode>,
)

data class MovieDetail(
    val movie: Movie,
    val synopsis: String,
    val genres: List<String> = emptyList(),
    val countries: List<String> = emptyList(),
    val actors: List<String> = emptyList(),
    val directors: List<String> = emptyList(),
    val servers: List<Server> = emptyList(),
    val relatedMovieSlugs: List<String> = emptyList(),
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
)

data class LogicalFocusState(
    val selectedItemId: String? = null,
    val selectedItemIndex: Int = 0,
    val restorationKey: String? = null,
)
