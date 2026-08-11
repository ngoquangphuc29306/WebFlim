package com.phevo.tv.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.repository.PhevoTvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface SearchUiState {
    data object EmptyQuery : SearchUiState
    data object Searching : SearchUiState
    data class Results(val movies: List<Movie>) : SearchUiState
    data object NoResults : SearchUiState
    data class Error(val message: String) : SearchUiState
}

class SearchViewModel(
    private val repository: PhevoTvRepository,
) : ViewModel() {
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _state = MutableStateFlow<SearchUiState>(SearchUiState.EmptyQuery)
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    private val _focusState = MutableStateFlow(LogicalFocusState(restorationKey = "search"))
    val focusState: StateFlow<LogicalFocusState> = _focusState.asStateFlow()

    fun updateQuery(value: String) {
        _query.value = value
        if (value.isBlank()) _state.value = SearchUiState.EmptyQuery
    }

    fun submitQuery() {
        val searchTerm = _query.value.trim()
        if (searchTerm.isEmpty()) {
            _state.value = SearchUiState.EmptyQuery
            return
        }

        _state.value = SearchUiState.Searching
        viewModelScope.launch {
            runCatching { repository.searchMovies(searchTerm) }
                .onSuccess { movies ->
                    _state.value = if (movies.isEmpty()) SearchUiState.NoResults else SearchUiState.Results(movies)
                }
                .onFailure { _state.value = SearchUiState.Error("Không thể tìm kiếm nội dung mẫu.") }
        }
    }

    fun rememberFocus(movieSlug: String?, itemIndex: Int) {
        _focusState.value = LogicalFocusState(movieSlug, itemIndex, "search-results")
    }
}
