package com.phevo.tv.ui.player

import android.graphics.Color
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.media3.common.util.UnstableApi
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.domain.model.PlayerError
import com.phevo.tv.domain.model.PlayerSelection
import com.phevo.tv.ui.common.PhevoTvButton

@Composable
@androidx.annotation.OptIn(UnstableApi::class)
fun PlayerScreen(
    selection: PlayerSelection,
    viewModel: PlayerViewModel,
    contentFocusRequester: FocusRequester,
    onBackDetail: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val lifecycleOwner = LocalLifecycleOwner.current
    val rootView = LocalView.current
    val playbackSessionActive = state.movieSlug.isNotBlank()

    LaunchedEffect(selection) {
        viewModel.start(selection)
        contentFocusRequester.requestFocus()
    }

    DisposableEffect(lifecycleOwner, viewModel) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> viewModel.onBackground()
                Lifecycle.Event.ON_START -> viewModel.onForeground()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            viewModel.closeSession()
        }
    }

    DisposableEffect(rootView, state.isPlaying) {
        rootView.keepScreenOn = state.isPlaying
        onDispose { rootView.keepScreenOn = false }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.AppBackground),
    ) {
        AndroidView(
            factory = { context ->
                PlayerView(context).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    setBackgroundColor(Color.BLACK)
                    useController = false
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    isFocusable = false
                    viewModel.attach(this)
                }
            },
            update = {
                if (playbackSessionActive) viewModel.attach(it)
            },
            onRelease = { viewModel.detach(it) },
            modifier = Modifier.fillMaxSize(),
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(PhevoTvColors.ScrimStrong)
                .padding(PhevoTvDimensions.SpaceMD),
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
        ) {
            Text(
                text = "${state.movieSlug} • ${state.episodeName ?: state.episodeSlug.orEmpty()} • ${state.serverName.orEmpty()}",
                style = PhevoTvTypography.TitleMedium,
                color = PhevoTvColors.TextPrimary,
                maxLines = 1,
            )
            Text(
                text = buildStatusText(state),
                style = PhevoTvTypography.Metadata,
                color = if (state.error == null) PhevoTvColors.TextSecondary else PhevoTvColors.Error,
                maxLines = 2,
            )
            LazyRow(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM)) {
                item {
                    PhevoTvButton(
                        label = if (state.isPlaying) "Tạm dừng" else "Phát",
                        onClick = { if (state.isPlaying) viewModel.pause() else viewModel.play() },
                        modifier = Modifier.focusRequester(contentFocusRequester),
                    )
                }
                item { PhevoTvButton("-10 giây", viewModel::seekBack, primary = false) }
                item { PhevoTvButton("+10 giây", viewModel::seekForward, primary = false) }
                item { PhevoTvButton("Tập trước", viewModel::playPreviousEpisode, primary = false) }
                item { PhevoTvButton("Tập sau", viewModel::playNextEpisode, primary = false) }
                if (state.canRetry) item {
                    PhevoTvButton("Thử lại", viewModel::retryCurrentSource, primary = false)
                }
                item { PhevoTvButton("Quay lại", onBackDetail, primary = false) }
            }

            if (state.servers.size > 1) {
                Text("Server", style = PhevoTvTypography.Metadata, color = PhevoTvColors.TextMuted)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM)) {
                    itemsIndexed(state.servers) { index, server ->
                        PhevoTvButton(
                            label = server.serverName,
                            onClick = { viewModel.switchServer(index) },
                            primary = index == state.serverIndex,
                        )
                    }
                }
            }

            val selectedServer = state.serverIndex?.let(state.servers::getOrNull)
            if (selectedServer != null && selectedServer.episodes.size > 1) {
                Text("Tập", style = PhevoTvTypography.Metadata, color = PhevoTvColors.TextMuted)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM)) {
                    itemsIndexed(selectedServer.episodes, key = { _, episode -> episode.episodeSlug }) { _, episode ->
                        PhevoTvButton(
                            label = episode.name,
                            onClick = { viewModel.switchEpisode(episode.episodeSlug) },
                            primary = episode.episodeSlug == state.episodeSlug,
                        )
                    }
                }
            }
            Spacer(Modifier.height(2.dp))
        }
    }
}

private fun buildStatusText(state: PlayerUiState): String {
    val source = when (state.source) {
        is PlaybackSource.DirectHls -> "HLS"
        is PlaybackSource.DirectProgressive -> "Progressive"
        is PlaybackSource.UnsupportedEmbed -> "Embed không hỗ trợ native"
        PlaybackSource.Missing -> "Thiếu nguồn"
        is PlaybackSource.Invalid -> "Nguồn không hợp lệ"
    }
    val error = state.error?.let { " • ${it.toEngineeringMessage()}" }.orEmpty()
    val firstFrame = if (state.hasRenderedFirstFrame) "frame=yes" else "frame=no"
    return "${state.playbackStatus} • $source • $firstFrame • ${formatTime(state.positionMs)} / ${formatTime(state.durationMs)} • buffered ${formatTime(state.bufferedPositionMs)}$error"
}

private fun PlayerError.toEngineeringMessage(): String = when (this) {
    is PlayerError.Network -> "Lỗi mạng"
    PlayerError.Timeout -> "Hết thời gian kết nối"
    is PlayerError.Http -> "HTTP $statusCode"
    is PlayerError.UnsupportedFormat -> message ?: "Định dạng không hỗ trợ"
    is PlayerError.InvalidSource -> message
    is PlayerError.MissingSource -> message
    is PlayerError.PlaybackFailure -> message ?: "Không thể phát"
    is PlayerError.Unknown -> message ?: "Lỗi không xác định"
}

private fun formatTime(valueMs: Long): String {
    val totalSeconds = valueMs.coerceAtLeast(0L) / 1_000L
    val hours = totalSeconds / 3_600L
    val minutes = (totalSeconds % 3_600L) / 60L
    val seconds = totalSeconds % 60L
    return if (hours > 0L) "%d:%02d:%02d".format(hours, minutes, seconds) else "%02d:%02d".format(minutes, seconds)
}
