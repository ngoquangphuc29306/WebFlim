package com.phevo.tv.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.domain.model.PlayerSelection
import com.phevo.tv.ui.common.PhevoTvButton

@Composable
fun PlayerPlaceholderScreen(
    selection: PlayerSelection,
    contentFocusRequester: FocusRequester,
    onBackDetail: () -> Unit,
) {
    Box(
        modifier = Modifier.fillMaxSize().background(PhevoTvColors.AppBackground),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("▶", style = PhevoTvTypography.DisplayLarge, color = PhevoTvColors.TextMuted)
            Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
            Text("Trình phát PHEVO TV", style = PhevoTvTypography.DisplayMedium, color = PhevoTvColors.TextPrimary)
            Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
            Text(
                selection.movieSlug.replace("-", " ").replaceFirstChar { it.uppercase() },
                style = PhevoTvTypography.TitleMedium,
                color = PhevoTvColors.TextSecondary,
            )
            selection.episodeSlug?.let {
                Spacer(Modifier.height(PhevoTvDimensions.SpaceXS))
                Text(it.replace("-", " "), style = PhevoTvTypography.Metadata, color = PhevoTvColors.TextMuted)
            }
            Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
            Text(
                "Native playback với Media3 được lên kế hoạch cho TV-4.\nTV-3 chỉ truyền selection, chưa tải URL và chưa phát video.",
                style = PhevoTvTypography.BodyMedium,
                color = PhevoTvColors.TextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.widthIn(max = 500.dp),
            )
            Spacer(Modifier.height(PhevoTvDimensions.SpaceXL))
            PhevoTvButton(
                "Quay lại chi tiết",
                onBackDetail,
                modifier = Modifier.focusRequester(contentFocusRequester),
                primary = false,
            )
        }
    }
}
