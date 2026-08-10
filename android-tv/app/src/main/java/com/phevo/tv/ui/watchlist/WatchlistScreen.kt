package com.phevo.tv.ui.watchlist

import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.ui.common.PosterMovieCard
import com.phevo.tv.ui.common.TvEmptyState

@Composable
fun WatchlistScreen(
    viewModel: WatchlistViewModel,
    contentFocusRequester: FocusRequester,
    onOpenDetail: (String) -> Unit,
    onExplore: () -> Unit,
) {
    val movies by viewModel.movies.collectAsStateWithLifecycle()
    if (movies.isEmpty()) {
        TvEmptyState(
            title = "Danh sách yêu thích trống",
            description = "Lưu phim để tìm lại nhanh trên PHEVO TV.",
            actionLabel = "Khám phá",
            onAction = onExplore,
            actionModifier = Modifier.focusRequester(contentFocusRequester),
        )
        return
    }

    LazyRow(
        modifier = Modifier.fillMaxSize().focusGroup(),
        state = rememberLazyListState(),
        contentPadding = PaddingValues(vertical = 48.dp, horizontal = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(movies, key = { it.movieSlug }) { movie ->
            PosterMovieCard(
                movie = movie,
                onClick = { onOpenDetail(movie.movieSlug) },
                modifier = if (movie == movies.first()) Modifier.focusRequester(contentFocusRequester) else Modifier,
            )
        }
    }
}
