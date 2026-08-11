package com.phevo.tv.ui.player

import android.graphics.Color
import android.view.KeyEvent
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.domain.model.PlaybackStatus
import com.phevo.tv.domain.model.PlayerError
import com.phevo.tv.domain.model.PlayerSelection
import com.phevo.tv.domain.model.Server
import com.phevo.tv.ui.common.EpisodeCard
import com.phevo.tv.ui.common.PhevoTvButton
import kotlinx.coroutines.delay

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

    var controlsState by remember { mutableStateOf(PlayerControlsState.Visible) }
    var lastInteractionTime by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val playButtonFocusRequester = remember { FocusRequester() }
    val hiddenControlsFocusRequester = remember { FocusRequester() }

    // AUTO-HIDE: Hide controls after 4 seconds of idle playing
    LaunchedEffect(state.isPlaying, controlsState, lastInteractionTime) {
        if (state.isPlaying && controlsState == PlayerControlsState.Visible) {
            while (true) {
                delay(500L)
                val elapsed = System.currentTimeMillis() - lastInteractionTime
                if (elapsed >= 4000L) {
                    controlsState = PlayerControlsState.Hidden
                    break
                }
            }
        }
    }

    // SHOW CONTROLS on state changes that need user attention
    LaunchedEffect(state.playbackStatus, state.error) {
        when (state.playbackStatus) {
            PlaybackStatus.ERROR,
            PlaybackStatus.UNSUPPORTED,
            PlaybackStatus.ENDED -> {
                controlsState = PlayerControlsState.Visible
                lastInteractionTime = System.currentTimeMillis()
            }
            else -> Unit
        }
    }

    // PAUSED: Keep controls visible
    LaunchedEffect(state.isPlaying) {
        if (!state.isPlaying && state.playbackStatus != PlaybackStatus.ENDED) {
            lastInteractionTime = System.currentTimeMillis()
        }
    }

    LaunchedEffect(selection) {
        viewModel.start(selection)
    }

    LaunchedEffect(controlsState, state.playbackStatus) {
        if (controlsState == PlayerControlsState.Hidden) {
            hiddenControlsFocusRequester.requestFocus()
        } else if (controlsState == PlayerControlsState.Visible &&
            state.playbackStatus !in listOf(
                PlaybackStatus.ERROR,
                PlaybackStatus.UNSUPPORTED,
                PlaybackStatus.ENDED,
            )
        ) {
            playButtonFocusRequester.requestFocus()
        }
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
            .background(PhevoTvColors.AppBackground)
            .focusRequester(hiddenControlsFocusRequester)
            .focusable()
            .onKeyEvent { keyEvent ->
                if (keyEvent.type != KeyEventType.KeyDown) return@onKeyEvent false
                when (keyEvent.key) {
                    Key.MediaPlay, Key.MediaPause, Key.MediaPlayPause -> {
                        if (state.isPlaying) viewModel.pause() else viewModel.play()
                        controlsState = PlayerControlsState.Visible
                        lastInteractionTime = System.currentTimeMillis()
                        true
                    }
                    Key.DirectionCenter -> {
                        when (controlsState) {
                            PlayerControlsState.Hidden -> {
                                controlsState = PlayerControlsState.Visible
                                lastInteractionTime = System.currentTimeMillis()
                                true
                            }
                            else -> false
                        }
                    }
                    Key.DirectionLeft -> {
                        if (controlsState == PlayerControlsState.Hidden) {
                            viewModel.seekBack()
                            lastInteractionTime = System.currentTimeMillis()
                            true
                        } else false
                    }
                    Key.DirectionRight -> {
                        if (controlsState == PlayerControlsState.Hidden) {
                            viewModel.seekForward()
                            lastInteractionTime = System.currentTimeMillis()
                            true
                        } else false
                    }
                    Key.DirectionUp, Key.DirectionDown -> {
                        if (controlsState == PlayerControlsState.Hidden) {
                            controlsState = PlayerControlsState.Visible
                            lastInteractionTime = System.currentTimeMillis()
                            true
                        } else {
                            lastInteractionTime = System.currentTimeMillis()
                            false
                        }
                    }
                    Key.Back -> {
                        when (controlsState) {
                            PlayerControlsState.EpisodePanelOpen, PlayerControlsState.ServerPanelOpen -> {
                                controlsState = PlayerControlsState.Visible
                                lastInteractionTime = System.currentTimeMillis()
                                true
                            }
                            else -> false
                        }
                    }
                    else -> false
                }
            },
    ) {
        // VIDEO SURFACE
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

        // BUFFERING OVERLAY
        if (state.playbackStatus == PlaybackStatus.PREPARING ||
            (state.playbackStatus == PlaybackStatus.BUFFERING && !state.hasRenderedFirstFrame)) {
            InitialLoadingOverlay()
        } else if (state.playbackStatus == PlaybackStatus.BUFFERING && state.hasRenderedFirstFrame) {
            RebufferingIndicator()
        }

        // ERROR OVERLAY
        val playbackError = state.error
        if (state.playbackStatus == PlaybackStatus.ERROR && playbackError != null) {
            ErrorOverlay(
                error = playbackError,
                canRetry = state.canRetry,
                hasServers = state.servers.size > 1,
                onRetry = viewModel::retryCurrentSource,
                onSwitchServer = { controlsState = PlayerControlsState.ServerPanelOpen },
                onBack = onBackDetail,
            )
        }

        // UNSUPPORTED OVERLAY
        if (state.playbackStatus == PlaybackStatus.UNSUPPORTED) {
            UnsupportedOverlay(
                hasServers = state.servers.size > 1,
                hasEpisodes = (state.serverIndex?.let(state.servers::getOrNull)?.episodes?.size ?: 0) > 1,
                onSwitchServer = { controlsState = PlayerControlsState.ServerPanelOpen },
                onSwitchEpisode = { controlsState = PlayerControlsState.EpisodePanelOpen },
                onBack = onBackDetail,
            )
        }

        // ENDED OVERLAY
        if (state.playbackStatus == PlaybackStatus.ENDED) {
            EndedOverlay(
                hasNextEpisode = state.hasNextEpisode,
                onPlayNext = viewModel::playNextEpisode,
                onReplay = {
                    viewModel.seekTo(0L)
                    viewModel.play()
                },
                onBack = onBackDetail,
            )
        }

        // MAIN PLAYER CONTROLS
        AnimatedVisibility(
            visible = controlsState == PlayerControlsState.Visible &&
                    state.playbackStatus !in listOf(
                        PlaybackStatus.ERROR,
                        PlaybackStatus.UNSUPPORTED,
                        PlaybackStatus.ENDED
                    ),
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            PlayerOverlay(
                state = state,
                onPlay = viewModel::play,
                onPause = viewModel::pause,
                onSeekBack = viewModel::seekBack,
                onSeekForward = viewModel::seekForward,
                onPreviousEpisode = viewModel::playPreviousEpisode,
                onNextEpisode = viewModel::playNextEpisode,
                onOpenEpisodePanel = {
                    controlsState = PlayerControlsState.EpisodePanelOpen
                    lastInteractionTime = System.currentTimeMillis()
                },
                onOpenServerPanel = {
                    controlsState = PlayerControlsState.ServerPanelOpen
                    lastInteractionTime = System.currentTimeMillis()
                },
                onBack = onBackDetail,
                playButtonFocusRequester = playButtonFocusRequester,
                onInteraction = { lastInteractionTime = System.currentTimeMillis() },
            )
        }

        // EPISODE PANEL
        if (controlsState == PlayerControlsState.EpisodePanelOpen) {
            val server = state.serverIndex?.let(state.servers::getOrNull)
            if (server != null) {
                EpisodePanel(
                    episodes = server.episodes,
                    currentEpisodeSlug = state.episodeSlug,
                    onSelectEpisode = { episodeSlug ->
                        viewModel.switchEpisode(episodeSlug)
                        controlsState = PlayerControlsState.Visible
                        lastInteractionTime = System.currentTimeMillis()
                    },
                    onBack = {
                        controlsState = PlayerControlsState.Visible
                        lastInteractionTime = System.currentTimeMillis()
                    },
                )
            }
        }

        // SERVER PANEL
        if (controlsState == PlayerControlsState.ServerPanelOpen) {
            ServerPanel(
                servers = state.servers,
                currentServerIndex = state.serverIndex,
                onSelectServer = { index ->
                    viewModel.switchServer(index)
                    controlsState = PlayerControlsState.Visible
                    lastInteractionTime = System.currentTimeMillis()
                },
                onBack = {
                    controlsState = PlayerControlsState.Visible
                    lastInteractionTime = System.currentTimeMillis()
                },
            )
        }
    }
}

@Composable
private fun PlayerOverlay(
    state: PlayerUiState,
    onPlay: () -> Unit,
    onPause: () -> Unit,
    onSeekBack: () -> Unit,
    onSeekForward: () -> Unit,
    onPreviousEpisode: () -> Unit,
    onNextEpisode: () -> Unit,
    onOpenEpisodePanel: () -> Unit,
    onOpenServerPanel: () -> Unit,
    onBack: () -> Unit,
    playButtonFocusRequester: FocusRequester,
    onInteraction: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.ScrimMedium),
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(PhevoTvDimensions.SafeAreaHorizontal)
                .padding(bottom = PhevoTvDimensions.SafeAreaHorizontal),
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
        ) {
            // METADATA
            Column(verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceXS)) {
                Text(
                    text = state.movieSlug,
                    style = PhevoTvTypography.DisplayMedium,
                    color = PhevoTvColors.TextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                val episodeServerText = buildString {
                    state.episodeName?.let { append(it) }
                    state.serverName?.let {
                        if (isNotEmpty()) append(" • ")
                        append(it)
                    }
                }
                if (episodeServerText.isNotEmpty()) {
                    Text(
                        text = episodeServerText,
                        style = PhevoTvTypography.TitleMedium,
                        color = PhevoTvColors.TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            // MAIN CONTROLS
            Row(
                horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PhevoTvButton(
                    label = "Lùi 10 giây",
                    onClick = {
                        onSeekBack()
                        onInteraction()
                    },
                    primary = false,
                )
                PhevoTvButton(
                    label = if (state.isPlaying) "Tạm dừng" else "Phát",
                    onClick = {
                        if (state.isPlaying) onPause() else onPlay()
                        onInteraction()
                    },
                    modifier = Modifier.focusRequester(playButtonFocusRequester),
                )
                PhevoTvButton(
                    label = "Tiến 10 giây",
                    onClick = {
                        onSeekForward()
                        onInteraction()
                    },
                    primary = false,
                )
            }

            // TIMELINE
            PlayerTimeline(
                positionMs = state.positionMs,
                durationMs = state.durationMs,
                bufferedPositionMs = state.bufferedPositionMs,
                onInteraction = onInteraction,
            )

            // SECONDARY ACTIONS
            Row(
                horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD),
            ) {
                if (state.hasPreviousEpisode) {
                    PhevoTvButton(
                        label = "Tập trước",
                        onClick = {
                            onPreviousEpisode()
                            onInteraction()
                        },
                        primary = false,
                    )
                }

                val selectedServer = state.serverIndex?.let(state.servers::getOrNull)
                if (selectedServer != null && selectedServer.episodes.size > 1) {
                    PhevoTvButton(
                        label = "Danh sách tập",
                        onClick = {
                            onOpenEpisodePanel()
                            onInteraction()
                        },
                        primary = false,
                    )
                }

                if (state.servers.size > 1) {
                    PhevoTvButton(
                        label = "Server",
                        onClick = {
                            onOpenServerPanel()
                            onInteraction()
                        },
                        primary = false,
                    )
                }

                if (state.hasNextEpisode) {
                    PhevoTvButton(
                        label = "Tập tiếp",
                        onClick = {
                            onNextEpisode()
                            onInteraction()
                        },
                        primary = false,
                    )
                }

                PhevoTvButton(
                    label = "Quay lại",
                    onClick = {
                        onBack()
                        onInteraction()
                    },
                    primary = false,
                )
            }
        }
    }
}

@Composable
private fun PlayerTimeline(
    positionMs: Long,
    durationMs: Long,
    bufferedPositionMs: Long,
    onInteraction: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = formatTime(positionMs),
                style = PhevoTvTypography.Metadata,
                color = PhevoTvColors.TextSecondary,
            )
            Text(
                text = formatTime(durationMs),
                style = PhevoTvTypography.Metadata,
                color = PhevoTvColors.TextSecondary,
            )
        }

        // Progress bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .background(PhevoTvColors.ProgressTrack, RoundedCornerShape(3.dp)),
        ) {
            val progress = if (durationMs > 0L) {
                (positionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
            } else 0f

            val bufferedProgress = if (durationMs > 0L) {
                (bufferedPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
            } else 0f

            // Buffered indicator
            Box(
                modifier = Modifier
                    .fillMaxWidth(bufferedProgress)
                    .height(6.dp)
                    .background(
                        PhevoTvColors.TextMuted.copy(alpha = 0.3f),
                        RoundedCornerShape(3.dp)
                    ),
            )

            // Current progress
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .height(6.dp)
                    .background(PhevoTvColors.ProgressFill, RoundedCornerShape(3.dp)),
            )
        }
    }
}

@Composable
private fun InitialLoadingOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.AppBackground),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
        ) {
            CircularProgressIndicator(
                color = PhevoTvColors.BrandPrimary,
                trackColor = PhevoTvColors.SurfaceElevated,
                strokeWidth = 4.dp,
                modifier = Modifier.width(56.dp).height(56.dp),
            )
            Text(
                text = "Đang tải...",
                style = PhevoTvTypography.BodyMedium,
                color = PhevoTvColors.TextSecondary,
            )
        }
    }
}

@Composable
private fun RebufferingIndicator() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(
            color = PhevoTvColors.BrandPrimary,
            trackColor = PhevoTvColors.SurfaceElevated.copy(alpha = 0.5f),
            strokeWidth = 4.dp,
            modifier = Modifier.width(48.dp).height(48.dp),
        )
    }
}

@Composable
private fun ErrorOverlay(
    error: PlayerError,
    canRetry: Boolean,
    hasServers: Boolean,
    onRetry: () -> Unit,
    onSwitchServer: () -> Unit,
    onBack: () -> Unit,
) {
    val initialFocusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) { initialFocusRequester.requestFocus() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.ScrimStrong),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
            modifier = Modifier.padding(PhevoTvDimensions.Space2XL),
        ) {
            Text(
                text = "⚠",
                style = PhevoTvTypography.DisplayLarge,
                color = PhevoTvColors.Error,
            )
            Text(
                text = "Không thể phát video",
                style = PhevoTvTypography.TitleLarge,
                color = PhevoTvColors.TextPrimary,
            )
            Text(
                text = error.toUserMessage(),
                style = PhevoTvTypography.BodyMedium,
                color = PhevoTvColors.TextSecondary,
            )

            Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))

            Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD)) {
                if (canRetry) {
                    PhevoTvButton(
                        label = "Thử lại",
                        onClick = onRetry,
                        modifier = Modifier.focusRequester(initialFocusRequester),
                    )
                }
                if (hasServers) {
                    PhevoTvButton(
                        label = "Đổi server",
                        onClick = onSwitchServer,
                        primary = false,
                        modifier = if (!canRetry) Modifier.focusRequester(initialFocusRequester) else Modifier,
                    )
                }
                PhevoTvButton(
                    label = "Quay lại",
                    onClick = onBack,
                    primary = false,
                    modifier = if (!canRetry && !hasServers) Modifier.focusRequester(initialFocusRequester) else Modifier,
                )
            }
        }
    }
}

@Composable
private fun UnsupportedOverlay(
    hasServers: Boolean,
    hasEpisodes: Boolean,
    onSwitchServer: () -> Unit,
    onSwitchEpisode: () -> Unit,
    onBack: () -> Unit,
) {
    val initialFocusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) { initialFocusRequester.requestFocus() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.ScrimStrong),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
            modifier = Modifier.padding(PhevoTvDimensions.Space2XL),
        ) {
            Text(
                text = "📱",
                style = PhevoTvTypography.DisplayLarge,
            )
            Text(
                text = "Nguồn này chưa hỗ trợ phát trực tiếp trên Android TV",
                style = PhevoTvTypography.TitleLarge,
                color = PhevoTvColors.TextPrimary,
            )
            Text(
                text = "Video này hiện chỉ có nguồn phát web nhúng. Hãy thử đổi server hoặc chọn tập khác.",
                style = PhevoTvTypography.BodyMedium,
                color = PhevoTvColors.TextSecondary,
            )

            Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))

            Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD)) {
                if (hasServers) {
                    PhevoTvButton(
                        label = "Đổi server",
                        onClick = onSwitchServer,
                        modifier = Modifier.focusRequester(initialFocusRequester),
                    )
                }
                if (hasEpisodes) {
                    PhevoTvButton(
                        label = "Chọn tập khác",
                        onClick = onSwitchEpisode,
                        primary = false,
                        modifier = if (!hasServers) Modifier.focusRequester(initialFocusRequester) else Modifier,
                    )
                }
                PhevoTvButton(
                    label = "Quay lại",
                    onClick = onBack,
                    primary = false,
                    modifier = if (!hasServers && !hasEpisodes) Modifier.focusRequester(initialFocusRequester) else Modifier,
                )
            }
        }
    }
}

@Composable
private fun EndedOverlay(
    hasNextEpisode: Boolean,
    onPlayNext: () -> Unit,
    onReplay: () -> Unit,
    onBack: () -> Unit,
) {
    val initialFocusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) { initialFocusRequester.requestFocus() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.ScrimStrong),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
            modifier = Modifier.padding(PhevoTvDimensions.Space2XL),
        ) {
            Text(
                text = "✓",
                style = PhevoTvTypography.DisplayLarge,
                color = PhevoTvColors.Success,
            )
            Text(
                text = "Đã phát xong",
                style = PhevoTvTypography.TitleLarge,
                color = PhevoTvColors.TextPrimary,
            )

            Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))

            Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD)) {
                if (hasNextEpisode) {
                    PhevoTvButton(
                        label = "Tập tiếp",
                        onClick = onPlayNext,
                        modifier = Modifier.focusRequester(initialFocusRequester),
                    )
                }
                PhevoTvButton(
                    label = "Phát lại",
                    onClick = onReplay,
                    primary = false,
                    modifier = if (!hasNextEpisode) Modifier.focusRequester(initialFocusRequester) else Modifier,
                )
                PhevoTvButton(
                    label = "Quay lại",
                    onClick = onBack,
                    primary = false,
                )
            }
        }
    }
}

@Composable
private fun EpisodePanel(
    episodes: List<Episode>,
    currentEpisodeSlug: String?,
    onSelectEpisode: (String) -> Unit,
    onBack: () -> Unit,
) {
    val gridState = rememberLazyGridState()
    val currentIndex = remember(currentEpisodeSlug) {
        episodes.indexOfFirst { it.episodeSlug == currentEpisodeSlug }
    }

    LaunchedEffect(currentIndex) {
        if (currentIndex >= 0) {
            gridState.scrollToItem(currentIndex.coerceAtLeast(0))
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.ScrimStrong)
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Back) {
                    onBack()
                    true
                } else false
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth(0.7f)
                .padding(PhevoTvDimensions.Space2XL),
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
        ) {
            Text(
                text = "Chọn tập",
                style = PhevoTvTypography.TitleLarge,
                color = PhevoTvColors.TextPrimary,
            )

            LazyVerticalGrid(
                columns = GridCells.Adaptive(120.dp),
                state = gridState,
                horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD),
                verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(400.dp)
                    .background(PhevoTvColors.SurfacePrimary, RoundedCornerShape(8.dp))
                    .padding(PhevoTvDimensions.SpaceLG),
            ) {
                itemsIndexed(episodes, key = { _, ep -> ep.episodeSlug }) { index, episode ->
                    val focusRequester = remember { FocusRequester() }
                    LaunchedEffect(Unit) {
                        if (index == currentIndex) {
                            focusRequester.requestFocus()
                        }
                    }
                    EpisodeCard(
                        episode = episode,
                        selected = episode.episodeSlug == currentEpisodeSlug,
                        onClick = { onSelectEpisode(episode.episodeSlug) },
                        modifier = Modifier.focusRequester(focusRequester),
                    )
                }
            }
        }
    }
}

@Composable
private fun ServerPanel(
    servers: List<Server>,
    currentServerIndex: Int?,
    onSelectServer: (Int) -> Unit,
    onBack: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.ScrimStrong)
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.Back) {
                    onBack()
                    true
                } else false
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .padding(PhevoTvDimensions.Space2XL),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
        ) {
            Text(
                text = "Chọn server",
                style = PhevoTvTypography.TitleLarge,
                color = PhevoTvColors.TextPrimary,
            )

            Column(
                verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD),
                modifier = Modifier
                    .background(PhevoTvColors.SurfacePrimary, RoundedCornerShape(8.dp))
                    .padding(PhevoTvDimensions.SpaceLG),
            ) {
                servers.forEachIndexed { index, server ->
                    val focusRequester = remember { FocusRequester() }
                    val isSelected = index == currentServerIndex

                    LaunchedEffect(Unit) {
                        if (isSelected) {
                            focusRequester.requestFocus()
                        }
                    }

                    var focused by remember { mutableStateOf(false) }
                    val backgroundColor = when {
                        isSelected && focused -> PhevoTvColors.BrandFocused
                        isSelected -> PhevoTvColors.BrandPrimary
                        focused -> PhevoTvColors.SurfaceElevated
                        else -> PhevoTvColors.SurfaceSecondary
                    }
                    val borderColor = when {
                        isSelected && focused -> PhevoTvColors.FocusText
                        focused -> PhevoTvColors.FocusOutline
                        isSelected -> PhevoTvColors.BrandPrimary
                        else -> PhevoTvColors.BorderSubtle
                    }

                    Box(
                        modifier = Modifier
                            .width(300.dp)
                            .height(PhevoTvDimensions.ButtonHeight)
                            .focusRequester(focusRequester)
                            .onFocusChanged { focused = it.isFocused }
                            .graphicsLayer {
                                val focusScale = if (focused) 1.035f else 1f
                                scaleX = focusScale
                                scaleY = focusScale
                                shadowElevation = if (focused) 4f else 0f
                                shape = RoundedCornerShape(8.dp)
                                clip = false
                            }
                            .border(
                                width = if (focused || isSelected) PhevoTvDimensions.FocusOutlineWidth else 1.dp,
                                color = borderColor,
                                shape = RoundedCornerShape(8.dp),
                            )
                            .clickable { onSelectServer(index) }
                            .background(backgroundColor, RoundedCornerShape(8.dp))
                            .padding(horizontal = PhevoTvDimensions.SpaceMD),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = server.serverName,
                            style = PhevoTvTypography.LabelLarge,
                            color = if (isSelected || focused) PhevoTvColors.FocusText else PhevoTvColors.TextPrimary,
                        )
                    }
                }
            }
        }
    }
}

private enum class PlayerControlsState {
    Hidden,
    Visible,
    EpisodePanelOpen,
    ServerPanelOpen,
}

private fun PlayerError.toUserMessage(): String = when (this) {
    is PlayerError.Network -> "Lỗi kết nối mạng"
    PlayerError.Timeout -> "Hết thời gian kết nối"
    is PlayerError.Http -> "Máy chủ không phản hồi. Hãy thử lại sau."
    is PlayerError.UnsupportedFormat -> "Định dạng video chưa được hỗ trợ"
    is PlayerError.InvalidSource -> "Nguồn video không hợp lệ"
    is PlayerError.MissingSource -> "Không tìm thấy nguồn video"
    is PlayerError.PlaybackFailure -> "Không thể phát video. Hãy thử lại sau."
    is PlayerError.Unknown -> "Đã xảy ra lỗi không xác định"
}

private fun formatTime(valueMs: Long): String {
    val totalSeconds = valueMs.coerceAtLeast(0L) / 1_000L
    val hours = totalSeconds / 3_600L
    val minutes = (totalSeconds % 3_600L) / 60L
    val seconds = totalSeconds % 60L
    return if (hours > 0L) "%d:%02d:%02d".format(hours, minutes, seconds) else "%02d:%02d".format(minutes, seconds)
}
