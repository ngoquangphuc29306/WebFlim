package com.phevo.tv.ui.history

import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
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
        TvEmptyState("Chưa có lịch sử", "Các tập đã mở sẽ xuất hiện ở đây.")
        return
    }

    androidx.compose.foundation.layout.Column(modifier = Modifier.fillMaxSize().focusGroup().padding(vertical = 48.dp)) {
        Text("Lịch sử xem", color = PhevoTvColors.TextPrimary)
        LazyRow(
            modifier = Modifier.fillMaxSize(),
            state = rememberLazyListState(),
            contentPadding = PaddingValues(vertical = 24.dp, horizontal = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
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
