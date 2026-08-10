package com.phevo.tv.ui.explore

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import com.phevo.tv.ui.common.TvEmptyState

@Composable
fun ExploreScreen(contentFocusRequester: FocusRequester, onBackHome: () -> Unit) {
    TvEmptyState(
        title = "Khám phá",
        description = "Bộ lọc thể loại, quốc gia và năm sẽ được kết nối ở TV-3.",
        actionLabel = "Về trang chủ",
        onAction = onBackHome,
        actionModifier = Modifier.focusRequester(contentFocusRequester),
        modifier = Modifier.fillMaxSize(),
    )
}
