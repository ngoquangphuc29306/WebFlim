package com.phevo.tv.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.HomeContent
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.model.MoviePage
import com.phevo.tv.domain.repository.MovieRepository
import com.phevo.tv.ui.common.toUserMessage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Content(val value: HomeContent) : HomeUiState
    data class Error(val message: String) : HomeUiState
}

class HomeViewModel(
    private val repository: MovieRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    private val _focusState = MutableStateFlow(LogicalFocusState(restorationKey = "home"))
    val focusState: StateFlow<LogicalFocusState> = _focusState.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = HomeUiState.Loading
        viewModelScope.launch {
            try {
                _state.value = loadHomeContent()
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                _state.value = HomeUiState.Error("Không thể tải nội dung.")
            }
        }
    }

    private suspend fun loadHomeContent(): HomeUiState = coroutineScope {
        val latest = async { repository.getLatestMovies() }.await()
        val latestMovies = (latest as? DataResult.Success)?.value?.items.orEmpty()
        if (latest is DataResult.Failure && latestMovies.isEmpty()) {
            return@coroutineScope HomeUiState.Error(latest.error.toUserMessage())
        }

        suspend fun items(load: suspend () -> DataResult<MoviePage>): List<com.phevo.tv.domain.model.Movie> =
            (load() as? DataResult.Success)?.value?.items.orEmpty()

        val series = async { items { repository.getMovieListBySlug("phim-bo") } }
        val singles = async { items { repository.getMovieListBySlug("phim-le") } }
        val subteam = async { items { repository.getMovieListBySlug("subteam") } }
        val animation = async { items { repository.getMoviesByGenre("hoat-hinh") } }

        val hero = latestMovies.firstOrNull()
            ?: series.await().firstOrNull()
            ?: singles.await().firstOrNull()
            ?: return@coroutineScope HomeUiState.Error("Không có nội dung để hiển thị.")

        HomeUiState.Content(
            HomeContent(
                heroMovie = hero,
                continueWatching = emptyList(),
                newMovies = latestMovies,
                series = series.await(),
                featuredMovies = singles.await(),
                subteamMovies = subteam.await(),
                animationMovies = animation.await(),
            ),
        )
    }

    fun rememberFocus(itemId: String?, itemIndex: Int, rowKey: String) {
        _focusState.value = LogicalFocusState(itemId, itemIndex, rowKey)
    }
}
