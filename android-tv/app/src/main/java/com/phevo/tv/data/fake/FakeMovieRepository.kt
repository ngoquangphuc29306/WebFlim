package com.phevo.tv.data.fake

import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.HomeContent
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.MovieType
import com.phevo.tv.domain.model.Server
import com.phevo.tv.domain.model.WatchHistoryItem
import com.phevo.tv.domain.repository.LogicalFocusStore
import com.phevo.tv.domain.repository.PhevoTvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class FakeMovieRepository(
    private val failHome: Boolean = false,
    emptyWatchlist: Boolean = false,
    emptyHistory: Boolean = false,
) : PhevoTvRepository {
    private val catalog = FakeCatalog.movies
    private val details = FakeCatalog.details
    private val _watchlistSlugs = MutableStateFlow(
        if (emptyWatchlist) emptySet() else setOf("dem-trang-tren-bien")
    )
    private val history = if (emptyHistory) emptyList() else FakeCatalog.history

    override val watchlistSlugs: StateFlow<Set<String>> = _watchlistSlugs.asStateFlow()

    override suspend fun loadHome(): HomeContent {
        if (failHome) error("Fake home failure")

        return HomeContent(
            heroMovie = catalog.first(),
            continueWatching = listOf(catalog[2]),
            newMovies = catalog.take(5),
            series = catalog.filter { it.type == MovieType.SERIES },
            featuredMovies = catalog.drop(1).take(5),
        )
    }

    override suspend fun searchMovies(query: String): List<Movie> {
        val normalized = query.trim().lowercase()
        if (normalized.isEmpty()) return emptyList()
        return catalog.filter {
            it.title.lowercase().contains(normalized) ||
                it.originalTitle.orEmpty().lowercase().contains(normalized)
        }
    }

    override fun getMovie(movieSlug: String): Movie? = catalog.firstOrNull { it.movieSlug == movieSlug }

    override fun getMovieDetail(movieSlug: String): MovieDetail? = details[movieSlug]

    override fun getHistory(): List<WatchHistoryItem> = history

    override fun toggleWatchlist(movieSlug: String) {
        _watchlistSlugs.value = _watchlistSlugs.value.toMutableSet().apply {
            if (!add(movieSlug)) remove(movieSlug)
        }
    }
}

class FakeLogicalFocusStore : LogicalFocusStore {
    private val _focusState = MutableStateFlow(LogicalFocusState())
    override val focusState: StateFlow<LogicalFocusState> = _focusState.asStateFlow()

    override fun rememberFocus(itemId: String?, itemIndex: Int, restorationKey: String) {
        _focusState.value = LogicalFocusState(itemId, itemIndex, restorationKey)
    }
}

object FakeCatalog {
    val movies = listOf(
        Movie(
            movieSlug = "dem-trang-tren-bien",
            title = "Đêm trắng trên biển",
            originalTitle = "The Night Across the Sea",
            year = 2025,
            type = MovieType.MOVIE,
            posterToken = "sea-night",
            backdropToken = "sea-night-wide",
            quality = "HD",
            rating = 8.2,
        ),
        Movie(
            movieSlug = "thanh-pho-khong-ngu",
            title = "Thành phố không ngủ với một cái tên rất dài để kiểm tra truncation",
            originalTitle = "City That Never Sleeps",
            year = 2024,
            type = MovieType.MOVIE,
            posterToken = "city",
            backdropToken = null,
            quality = "4K",
            rating = 7.8,
        ),
        Movie(
            movieSlug = "hanh-trinh-cuoi-cung",
            title = "Hành trình cuối cùng",
            originalTitle = "The Last Journey",
            year = 2023,
            type = MovieType.SERIES,
            posterToken = "journey",
            backdropToken = "journey-wide",
            episodeLabel = "Tập 2/8",
            rating = 8.7,
        ),
        Movie(
            movieSlug = "muon-mau",
            title = "Muôn màu",
            originalTitle = null,
            year = 2022,
            type = MovieType.SERIES,
            posterToken = null,
            backdropToken = "colors-wide",
            episodeLabel = "Đang cập nhật",
        ),
        Movie(
            movieSlug = "vuon-sao",
            title = "Vườn sao",
            originalTitle = "Garden of Stars",
            year = 2025,
            type = MovieType.MOVIE,
            posterToken = "stars",
            backdropToken = "stars-wide",
            quality = "FHD",
            rating = 8.0,
        ),
        Movie(
            movieSlug = "duong-ve-nha",
            title = "Đường về nhà",
            originalTitle = "The Way Home",
            year = 2021,
            type = MovieType.MOVIE,
            posterToken = "home",
            backdropToken = "home-wide",
            rating = 7.4,
        ),
    )

    private val episodeSet = listOf(
        Episode("hanh-trinh-cuoi-cung-tap-1", "Tập 1"),
        Episode("hanh-trinh-cuoi-cung-tap-2", "Tập 2"),
        Episode("hanh-trinh-cuoi-cung-tap-3", "Tập 3"),
        Episode("hanh-trinh-cuoi-cung-tap-4", "Tập 4"),
    )

    val details: Map<String, MovieDetail> = movies.associate { movie ->
        movie.movieSlug to MovieDetail(
            movie = movie,
            synopsis = "Một câu chuyện về những lựa chọn, ký ức và con đường đưa con người trở về bên nhau.",
            genres = listOf("Tâm lý", "Phiêu lưu"),
            countries = listOf("Việt Nam"),
            actors = listOf("Nguyễn An", "Minh Châu"),
            directors = listOf("Lê Hoàng"),
            servers = if (movie.type == MovieType.SERIES) {
                listOf(
                    Server("PHEVO Demo 1", episodeSet),
                    Server("PHEVO Demo 2", episodeSet.dropLast(1)),
                )
            } else {
                emptyList()
            },
            relatedMovieSlugs = movies.filter { it.movieSlug != movie.movieSlug }.take(4).map { it.movieSlug },
        )
    }

    val history = listOf(
        WatchHistoryItem(
            movieSlug = "hanh-trinh-cuoi-cung",
            episodeSlug = "hanh-trinh-cuoi-cung-tap-2",
            episodeName = "Tập 2",
            progressPercent = 42,
            updatedAt = 1_725_000_000_000,
        )
    )
}
