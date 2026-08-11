package com.phevo.tv.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.phevo.tv.domain.model.HomeContent
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.repository.PhevoTvRepository
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
    private val repository: PhevoTvRepository,
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
            runCatching { repository.loadHome() }
                .onSuccess { _state.value = HomeUiState.Content(it) }
                .onFailure { _state.value = HomeUiState.Error("Không thể tải nội dung mẫu.") }
        }
    }

    fun rememberFocus(itemId: String?, itemIndex: Int, rowKey: String) {
        _focusState.value = LogicalFocusState(itemId, itemIndex, rowKey)
    }
}
