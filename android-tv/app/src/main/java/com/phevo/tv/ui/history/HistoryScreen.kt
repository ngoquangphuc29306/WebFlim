package com.phevo.tv.ui.history

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
import com.phevo.tv.ui.common.ContinueWatchingCard
import com.phevo.tv.ui.common.TvEmptyState

@Composable
fun HistoryScreen(
    viewModel: HistoryViewModel,
    contentFocusRequester: FocusRequester,
    onOpenDetail: (String) -> Unit,
) {
    val entries by viewModel.entries.collectAsStateWithLifecycle()
    if (entries.isEmpty()) {
        TvEmptyState(
            "Chưa có lịch sử",
            "Các tập đã mở sẽ xuất hiện ở đây.",
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
            "Lịch sử xem",
            style = PhevoTvTypography.DisplayMedium,
            color = PhevoTvColors.TextPrimary,
            modifier = Modifier.padding(start = PhevoTvDimensions.SafeAreaHorizontal),
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
        Text(
            "${entries.size} tập đã xem",
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
            items(entries, key = { it.record.movieSlug + it.record.episodeSlug }) { entry ->
                ContinueWatchingCard(
                    movie = entry.movie,
                    progressPercent = entry.record.progressPercent,
                    onClick = { onOpenDetail(entry.movie.movieSlug) },
                    modifier = if (entry == entries.first()) Modifier.focusRequester(contentFocusRequester) else Modifier,
                )
            }
        }
    }
}
