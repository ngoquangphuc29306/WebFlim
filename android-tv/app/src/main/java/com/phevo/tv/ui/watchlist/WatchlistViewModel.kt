package com.phevo.tv.ui.watchlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.repository.PhevoTvRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

class WatchlistViewModel(
    private val repository: PhevoTvRepository,
) : ViewModel() {
    val movies: StateFlow<List<Movie>> = repository.watchlistSlugs
        .map { slugs -> slugs.mapNotNull(repository::getMovie) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun toggle(movieSlug: String) = repository.toggleWatchlist(movieSlug)
}
