package com.phevo.tv.ui.player

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.ui.common.PhevoTvButton

@Composable
fun PlayerPlaceholderScreen(movieSlug: String, contentFocusRequester: FocusRequester, onBackDetail: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Trình phát PHEVO TV", style = MaterialTheme.typography.displayMedium)
        Text("Phim: $movieSlug", style = MaterialTheme.typography.bodyLarge, color = PhevoTvColors.TextSecondary)
        Text(
            "Native playback với Media3 được lên kế hoạch cho TV-4. TV-1 không tải URL và không phát video.",
            style = MaterialTheme.typography.bodyLarge,
            color = PhevoTvColors.TextSecondary,
        )
        PhevoTvButton("Quay lại chi tiết", onBackDetail, modifier = Modifier.focusRequester(contentFocusRequester))
    }
}
