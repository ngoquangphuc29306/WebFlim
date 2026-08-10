package com.phevo.tv.ui.history

import androidx.lifecycle.ViewModel
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.WatchHistoryItem
import com.phevo.tv.domain.repository.PhevoTvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class HistoryEntry(
    val record: WatchHistoryItem,
    val movie: Movie,
)

class HistoryViewModel(
    repository: PhevoTvRepository,
) : ViewModel() {
    private val _entries = MutableStateFlow(
        repository.getHistory().mapNotNull { record ->
            repository.getMovie(record.movieSlug)?.let { HistoryEntry(record, it) }
        }
    )
    val entries: StateFlow<List<HistoryEntry>> = _entries.asStateFlow()
}
