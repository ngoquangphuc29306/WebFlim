package com.phevo.tv.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.Pagination
import com.phevo.tv.domain.repository.MovieRepository
import com.phevo.tv.ui.common.toUserMessage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface SearchUiState {
    data object EmptyQuery : SearchUiState
    data object Searching : SearchUiState
    data class Results(val movies: List<Movie>, val pagination: Pagination) : SearchUiState
    data object NoResults : SearchUiState
    data class Error(val message: String) : SearchUiState
}

class SearchViewModel(
    private val repository: MovieRepository,
) : ViewModel() {
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _state = MutableStateFlow<SearchUiState>(SearchUiState.EmptyQuery)
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    private val _focusState = MutableStateFlow(LogicalFocusState(restorationKey = "search"))
    val focusState: StateFlow<LogicalFocusState> = _focusState.asStateFlow()

    private var searchJob: Job? = null

    fun updateQuery(value: String) {
        _query.value = value
        if (value.isBlank()) {
            searchJob?.cancel()
            _state.value = SearchUiState.EmptyQuery
        }
    }

    fun submitQuery() {
        val searchTerm = _query.value.trim()
        if (searchTerm.isEmpty()) {
            searchJob?.cancel()
            _state.value = SearchUiState.EmptyQuery
            return
        }

        searchJob?.cancel()
        _state.value = SearchUiState.Searching
        searchJob = viewModelScope.launch {
            try {
                when (val result = repository.searchMovies(searchTerm, 1)) {
                    is DataResult.Success -> {
                        _state.value = if (result.value.items.isEmpty()) {
                            SearchUiState.NoResults
                        } else {
                            SearchUiState.Results(result.value.items, result.value.pagination)
                        }
                    }
                    is DataResult.Failure -> _state.value = SearchUiState.Error(result.error.toUserMessage())
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            }
        }
    }

    fun loadNextPage() {
        val current = _state.value as? SearchUiState.Results ?: return
        if (current.pagination.currentPage >= current.pagination.totalPages) return
        val searchTerm = _query.value.trim()
        if (searchTerm.isEmpty()) return

        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            try {
                when (val result = repository.searchMovies(searchTerm, current.pagination.currentPage + 1)) {
                    is DataResult.Success -> {
                        val merged = (current.movies + result.value.items).distinctBy { it.movieSlug }
                        _state.value = if (merged.isEmpty()) SearchUiState.NoResults else {
                            SearchUiState.Results(merged, result.value.pagination)
                        }
                    }
                    is DataResult.Failure -> _state.value = SearchUiState.Error(result.error.toUserMessage())
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            }
        }
    }

    fun rememberFocus(movieSlug: String?, itemIndex: Int) {
        _focusState.value = LogicalFocusState(movieSlug, itemIndex, "search-results")
    }
}
