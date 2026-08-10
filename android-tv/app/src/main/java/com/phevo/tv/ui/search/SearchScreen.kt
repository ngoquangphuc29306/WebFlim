package com.phevo.tv.ui.search

import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.ui.common.PosterMovieCard
import com.phevo.tv.ui.common.TvEmptyState
import com.phevo.tv.ui.common.TvErrorState
import com.phevo.tv.ui.common.TvLoadingState

@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    contentFocusRequester: FocusRequester,
    onOpenDetail: (String) -> Unit,
) {
    val query by viewModel.query.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize().focusGroup().padding(vertical = 48.dp)) {
        Text("Tìm kiếm", style = MaterialTheme.typography.displayMedium)
        Spacer(Modifier.height(20.dp))
        OutlinedTextField(
            value = query,
            onValueChange = viewModel::updateQuery,
            modifier = Modifier
                .fillMaxWidth(0.65f)
                .height(64.dp)
                .focusRequester(contentFocusRequester),
            label = { Text("Tìm tên phim mẫu") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { viewModel.submitQuery() }),
        )
        Spacer(Modifier.height(32.dp))

        when (val value = state) {
            SearchUiState.EmptyQuery -> TvEmptyState("Bắt đầu tìm kiếm", "Nhập tên phim mẫu để lọc dữ liệu TV-1.")
            SearchUiState.Searching -> TvLoadingState()
            SearchUiState.NoResults -> TvEmptyState("Không tìm thấy phim", "Thử một từ khóa khác trong dữ liệu mẫu.")
            is SearchUiState.Error -> TvErrorState(onRetry = viewModel::submitQuery)
            is SearchUiState.Results -> {
                Text("Kết quả", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                LazyRow(
                    state = rememberLazyListState(),
                    modifier = Modifier.fillMaxWidth().focusGroup(),
                    contentPadding = PaddingValues(horizontal = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    itemsIndexed(value.movies, key = { _, movie -> movie.movieSlug }) { index, movie ->
                        PosterMovieCard(
                            movie = movie,
                            onClick = { onOpenDetail(movie.movieSlug) },
                            onFocused = { viewModel.rememberFocus(movie.movieSlug, index) },
                        )
                    }
                }
            }
        }
    }
}
