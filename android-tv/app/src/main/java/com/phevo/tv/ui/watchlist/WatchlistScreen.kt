package com.phevo.tv.ui.watchlist

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .focusGroup()
            .padding(top = PhevoTvDimensions.Space2XL),
    ) {
        Text(
            "Yêu thích",
            style = PhevoTvTypography.DisplayMedium,
            color = PhevoTvColors.TextPrimary,
            modifier = Modifier.padding(start = PhevoTvDimensions.SafeAreaHorizontal),
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
        Text(
            "${movies.size} phim đã lưu",
            style = PhevoTvTypography.BodyMedium,
            color = PhevoTvColors.TextMuted,
            modifier = Modifier.padding(start = PhevoTvDimensions.SafeAreaHorizontal),
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))

        LazyRow(
            modifier = Modifier.fillMaxWidth().focusGroup(),
            state = rememberLazyListState(),
            contentPadding = PaddingValues(horizontal = PhevoTvDimensions.SafeAreaHorizontal - PhevoTvDimensions.FocusClipPadding),
            horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.CardGap),
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
}
