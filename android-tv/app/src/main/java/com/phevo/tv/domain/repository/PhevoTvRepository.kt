package com.phevo.tv.domain.repository

import com.phevo.tv.domain.model.HomeContent
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.WatchHistoryItem
import kotlinx.coroutines.flow.StateFlow

interface PhevoTvRepository {
    val watchlistSlugs: StateFlow<Set<String>>

    suspend fun loadHome(): HomeContent

    suspend fun searchMovies(query: String): List<Movie>

    fun getMovie(movieSlug: String): Movie?

    fun getMovieDetail(movieSlug: String): MovieDetail?

    fun getHistory(): List<WatchHistoryItem>

    fun toggleWatchlist(movieSlug: String)
}

interface LogicalFocusStore {
    val focusState: StateFlow<LogicalFocusState>

    fun rememberFocus(itemId: String?, itemIndex: Int, restorationKey: String)
}
