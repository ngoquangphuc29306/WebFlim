package com.phevo.tv.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.phevo.tv.domain.model.DataError
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.PlayerSelection
import com.phevo.tv.domain.repository.MovieRepository
import com.phevo.tv.ui.common.toUserMessage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface DetailUiState {
    data object Loading : DetailUiState
    data class Content(
        val detail: MovieDetail,
        val relatedMovies: List<Movie> = emptyList(),
        val relatedLoading: Boolean = false,
    ) : DetailUiState
    data class NotFound(val message: String) : DetailUiState
    data class Error(val message: String) : DetailUiState
}

class DetailViewModel(
    private val repository: MovieRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<DetailUiState>(DetailUiState.Loading)
    val state: StateFlow<DetailUiState> = _state.asStateFlow()

    private val _focusState = MutableStateFlow(LogicalFocusState(restorationKey = "detail"))
    val focusState: StateFlow<LogicalFocusState> = _focusState.asStateFlow()

    private var loadJob: Job? = null
    private var relatedJob: Job? = null
    private var requestGeneration = 0

    fun load(movieSlug: String) {
        val cleanSlug = movieSlug.trim()
        val generation = ++requestGeneration
        loadJob?.cancel()
        relatedJob?.cancel()
        _state.value = DetailUiState.Loading
        loadJob = viewModelScope.launch {
            try {
                val result = repository.getMovieDetail(cleanSlug)
                if (generation != requestGeneration) return@launch
                when (result) {
                    is DataResult.Success -> {
                        val detail = result.value
                        val hasPrimaryCategorySlug = detail.categories.firstOrNull()?.slug?.isNotBlank() == true
                        _state.value = DetailUiState.Content(
                            detail = detail,
                            relatedLoading = hasPrimaryCategorySlug,
                        )
                        if (hasPrimaryCategorySlug) {
                            relatedJob = viewModelScope.launch {
                                loadRelatedMovies(detail, generation)
                            }
                        }
                    }
                    is DataResult.Failure -> _state.value = when (result.error) {
                        is DataError.NotFound -> DetailUiState.NotFound(result.error.toUserMessage())
                        else -> DetailUiState.Error(result.error.toUserMessage())
                    }
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            }
        }
    }

    private suspend fun loadRelatedMovies(detail: MovieDetail, generation: Int) {
        val primaryCategorySlug = detail.categories.firstOrNull()?.slug?.trim().orEmpty()
        if (primaryCategorySlug.isEmpty()) return

        try {
            val primaryItems = when (val result = repository.getMoviesByGenre(primaryCategorySlug, 1)) {
                is DataResult.Success -> result.value.items
                is DataResult.Failure -> emptyList()
            }
            val primaryWithoutCurrent = primaryItems.filter { it.movieSlug != detail.movie.movieSlug }
            var related = normalizeRelated(primaryWithoutCurrent, detail.movie.movieSlug)

            if (primaryWithoutCurrent.size < RelatedMinimumBeforeFallback) {
                val fallbackItems = when (val result = repository.getLatestMovies(1)) {
                    is DataResult.Success -> result.value.items
                    is DataResult.Failure -> emptyList()
                }
                related = normalizeRelated(related + fallbackItems, detail.movie.movieSlug)
            }

            if (generation == requestGeneration) {
                val current = _state.value as? DetailUiState.Content
                if (current?.detail?.movie?.movieSlug == detail.movie.movieSlug) {
                    _state.value = current.copy(
                        relatedMovies = related.take(RelatedResultCap),
                        relatedLoading = false,
                    )
                }
            }
        } catch (cancelled: CancellationException) {
            throw cancelled
        }
    }

    private fun normalizeRelated(items: List<Movie>, currentMovieSlug: String): List<Movie> = items
        .asSequence()
        .filter { it.movieSlug.isNotBlank() && it.movieSlug != currentMovieSlug }
        .distinctBy { it.movieSlug }
        .toList()

    private companion object {
        const val RelatedMinimumBeforeFallback = 5
        const val RelatedResultCap = 12
    }

    fun rememberFocus(itemId: String?, itemIndex: Int, rowKey: String) {
        _focusState.value = LogicalFocusState(itemId, itemIndex, rowKey)
    }

    fun selectionFor(detail: MovieDetail, serverIndex: Int = 0, episodeSlug: String? = null): PlayerSelection {
        val safeServerIndex = serverIndex.coerceIn(0, (detail.servers.size - 1).coerceAtLeast(0))
        val server = detail.servers.getOrNull(safeServerIndex)
        val episode = episodeSlug?.let { slug -> server?.episodes?.firstOrNull { it.episodeSlug == slug } }
            ?: server?.episodes?.firstOrNull()
        return PlayerSelection(
            movieSlug = detail.movie.movieSlug,
            episodeSlug = episode?.episodeSlug,
            serverIndex = server?.let { safeServerIndex },
            serverName = server?.serverName,
        )
    }
}
