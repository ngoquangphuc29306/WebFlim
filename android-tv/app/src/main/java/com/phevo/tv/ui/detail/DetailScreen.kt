package com.phevo.tv.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvShapes
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.ui.common.EpisodeCard
import com.phevo.tv.ui.common.FakeArtwork
import com.phevo.tv.ui.common.PhevoTvButton
import com.phevo.tv.ui.common.PosterMovieCard
import com.phevo.tv.ui.common.TvErrorState
import com.phevo.tv.ui.common.TvLoadingState

@Composable
fun DetailScreen(
    movieSlug: String,
    viewModel: DetailViewModel,
    contentFocusRequester: FocusRequester,
    railFocusRequester: FocusRequester,
    onPlay: (com.phevo.tv.domain.model.PlayerSelection) -> Unit,
    onToggleWatchlist: (String) -> Unit,
    onOpenRelated: (String) -> Unit,
) {
    LaunchedEffect(movieSlug) { viewModel.load(movieSlug) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    when (state) {
        DetailUiState.Loading -> TvLoadingState()
        is DetailUiState.NotFound -> TvErrorState(message = (state as DetailUiState.NotFound).message, onRetry = { viewModel.load(movieSlug) }, initialFocusRequester = contentFocusRequester)
        is DetailUiState.Error -> TvErrorState(message = (state as DetailUiState.Error).message, onRetry = { viewModel.load(movieSlug) }, initialFocusRequester = contentFocusRequester)
        is DetailUiState.Content -> DetailContent(
            detail = (state as DetailUiState.Content).detail,
            relatedMovies = (state as DetailUiState.Content).relatedMovies,
            relatedLoading = (state as DetailUiState.Content).relatedLoading,
            contentFocusRequester = contentFocusRequester,
            railFocusRequester = railFocusRequester,
            onPlay = onPlay,
            onToggleWatchlist = onToggleWatchlist,
            onOpenRelated = onOpenRelated,
            viewModel = viewModel,
        )
    }
}

@Composable
private fun DetailContent(
    detail: MovieDetail,
    relatedMovies: List<com.phevo.tv.domain.model.Movie>,
    relatedLoading: Boolean,
    contentFocusRequester: FocusRequester,
    railFocusRequester: FocusRequester,
    onPlay: (com.phevo.tv.domain.model.PlayerSelection) -> Unit,
    onToggleWatchlist: (String) -> Unit,
    onOpenRelated: (String) -> Unit,
    viewModel: DetailViewModel,
) {
    val logicalFocus by viewModel.focusState.collectAsStateWithLifecycle()
    var selectedServerIndex by remember(detail.movie.movieSlug) { mutableIntStateOf(0) }
    var selectedEpisodeSlug by remember(detail.movie.movieSlug) { mutableStateOf<String?>(null) }
    val serverFocusRequester = remember(detail.movie.movieSlug) { FocusRequester() }
    val relatedFocusRequester = remember(detail.movie.movieSlug) { FocusRequester() }
    val relatedFocusRequesters = remember(detail.movie.movieSlug) { mutableStateMapOf<String, FocusRequester>() }
    val relatedListState = rememberLazyListState()
    val relatedUpFocusRequester = if (detail.servers.isNotEmpty()) serverFocusRequester else contentFocusRequester

    LaunchedEffect(detail.movie.movieSlug, relatedMovies, logicalFocus) {
        val targetSlug = logicalFocus.selectedItemId
        val targetIndex = relatedMovies.indexOfFirst { it.movieSlug == targetSlug }
        if (logicalFocus.restorationKey == "detail-related" && targetIndex >= 0 && targetSlug != null) {
            relatedListState.scrollToItem(targetIndex)
            withFrameNanos { }
            relatedFocusRequesters[targetSlug]?.requestFocus()
        } else {
            contentFocusRequester.requestFocus()
        }
    }
    val server = detail.servers.getOrNull(selectedServerIndex)
    val selectedEpisode = server?.episodes?.firstOrNull { it.episodeSlug == selectedEpisodeSlug }
        ?: server?.episodes?.firstOrNull()

    LazyColumn(
        modifier = Modifier.fillMaxSize().focusGroup(),
        verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
    ) {
        item {
            Box(Modifier.fillMaxWidth().height(PhevoTvDimensions.DetailBackdropHeight)) {
                FakeArtwork(detail.movie.backdropToken, detail.movie.title, Modifier.fillMaxSize())
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.verticalGradient(colors = listOf(PhevoTvColors.ScrimLight, PhevoTvColors.ScrimStrong)),
                    ),
                )
            }
        }
        item {
            Row(
                modifier = Modifier.padding(horizontal = PhevoTvDimensions.SafeAreaHorizontal),
                horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
                verticalAlignment = Alignment.Top,
            ) {
                FakeArtwork(
                    detail.movie.posterToken,
                    detail.movie.title,
                    Modifier.width(PhevoTvDimensions.DetailPosterWidth)
                        .height(PhevoTvDimensions.DetailPosterHeight)
                        .clip(PhevoTvShapes.Card),
                )
                Column(Modifier.weight(1f)) {
                    Text(detail.movie.title, style = PhevoTvTypography.DisplayMedium, color = PhevoTvColors.TextPrimary, maxLines = 2)
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
                    Text(
                        buildString {
                            detail.movie.year?.let { append(it) }
                            if (detail.movie.year != null) append(" • ")
                            append(if (detail.movie.type == com.phevo.tv.domain.model.MovieType.SERIES) "Phim bộ" else "Phim lẻ")
                            detail.movie.quality?.let { append(" • $it") }
                            detail.movie.rating?.let { append(" • ★ $it") }
                        },
                        style = PhevoTvTypography.Metadata,
                        color = PhevoTvColors.TextSecondary,
                    )
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
                    Text(detail.synopsis, style = PhevoTvTypography.BodyLarge, color = PhevoTvColors.TextSecondary, maxLines = 4)
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
                    Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD)) {
                        PhevoTvButton(
                            "▶  Xem ngay",
                            { onPlay(viewModel.selectionFor(detail, selectedServerIndex, selectedEpisodeSlug)) },
                            modifier = Modifier
                                .focusRequester(contentFocusRequester)
                                .focusProperties { left = railFocusRequester },
                        )
                        PhevoTvButton("♡  Yêu thích", { onToggleWatchlist(detail.movie.movieSlug) }, primary = false)
                    }
                }
            }
        }
        item {
            Column(
                modifier = Modifier.padding(horizontal = PhevoTvDimensions.SafeAreaHorizontal),
                verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
            ) {
                if (detail.genres.isNotEmpty()) Text("Thể loại: ${detail.genres.joinToString(" • ")}", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextMuted)
                if (detail.countries.isNotEmpty()) Text("Quốc gia: ${detail.countries.joinToString(" • ")}", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextMuted)
                if (detail.directors.isNotEmpty()) Text("Đạo diễn: ${detail.directors.joinToString(", ")}", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextMuted)
                if (detail.actors.isNotEmpty()) Text("Diễn viên: ${detail.actors.joinToString(", ")}", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextMuted)
            }
        }
        if (detail.servers.isNotEmpty()) {
            item {
                Column(Modifier.padding(horizontal = PhevoTvDimensions.SafeAreaHorizontal)) {
                    Text("Nguồn phát", style = PhevoTvTypography.TitleLarge, color = PhevoTvColors.TextPrimary)
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
                    Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD)) {
                        detail.servers.forEachIndexed { index, currentServer ->
                            PhevoTvButton(
                                currentServer.serverName,
                                {
                                    selectedServerIndex = index
                                    if (currentServer.episodes.none { it.episodeSlug == selectedEpisodeSlug }) {
                                        selectedEpisodeSlug = currentServer.episodes.firstOrNull()?.episodeSlug
                                    }
                                },
                                modifier = Modifier
                                    .then(if (index == 0) Modifier.focusRequester(serverFocusRequester) else Modifier)
                                    .focusProperties {
                                        up = contentFocusRequester
                                        if (relatedMovies.isNotEmpty()) down = relatedFocusRequester
                                        if (index == 0) left = railFocusRequester
                                    },
                                primary = selectedServerIndex == index,
                            )
                        }
                    }
                }
            }
            item {
                Column(Modifier.padding(start = PhevoTvDimensions.SafeAreaHorizontal)) {
                    Text("Danh sách tập", style = PhevoTvTypography.TitleLarge, color = PhevoTvColors.TextPrimary)
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
                    if (server?.episodes.isNullOrEmpty()) {
                        Text("Server này chưa có tập phim.", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextMuted)
                    } else {
                        LazyRow(
                            Modifier.fillMaxWidth().focusGroup().focusProperties {
                                if (relatedMovies.isNotEmpty()) down = relatedFocusRequester
                            },
                            contentPadding = PaddingValues(end = PhevoTvDimensions.SafeAreaHorizontal),
                            horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
                        ) {
                            items(server?.episodes.orEmpty(), key = { it.episodeSlug }) { episode ->
                                EpisodeCard(
                                    episode = episode,
                                    selected = episode.episodeSlug == selectedEpisode?.episodeSlug,
                                    onClick = {
                                        selectedEpisodeSlug = episode.episodeSlug
                                        onPlay(viewModel.selectionFor(detail, selectedServerIndex, episode.episodeSlug))
                                    },
                                    modifier = Modifier.focusProperties {
                                        up = serverFocusRequester
                                        if (episode == server?.episodes?.firstOrNull()) left = railFocusRequester
                                    },
                                )
                            }
                        }
                    }
                }
            }
        } else {
            item {
                Text(
                    "Chưa có tập phim hoặc server cho nội dung này.",
                    style = PhevoTvTypography.BodyMedium,
                    color = PhevoTvColors.TextMuted,
                    modifier = Modifier.padding(horizontal = PhevoTvDimensions.SafeAreaHorizontal),
                )
            }
        }
        if (relatedLoading) {
            item {
                Text(
                    "Đang tải phim cùng thể loại...",
                    style = PhevoTvTypography.TitleLarge,
                    color = PhevoTvColors.TextMuted,
                    modifier = Modifier.padding(horizontal = PhevoTvDimensions.SafeAreaHorizontal),
                )
            }
        } else if (relatedMovies.isNotEmpty()) {
            item {
                Column(Modifier.padding(start = PhevoTvDimensions.SafeAreaHorizontal)) {
                    Text(
                        "Phim cùng thể loại",
                        style = PhevoTvTypography.TitleLarge,
                        color = PhevoTvColors.TextPrimary,
                    )
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
                    LazyRow(
                        Modifier.fillMaxWidth().focusGroup().focusProperties {
                            up = relatedUpFocusRequester
                        },
                        contentPadding = PaddingValues(end = PhevoTvDimensions.SafeAreaHorizontal),
                        horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD),
                    ) {
                        itemsIndexed(relatedMovies, key = { _, movie -> movie.movieSlug }) { index, movie ->
                            val movieFocusRequester = relatedFocusRequesters.getOrPut(movie.movieSlug) {
                                if (index == 0) relatedFocusRequester else FocusRequester()
                            }
                            PosterMovieCard(
                                movie = movie,
                                onClick = { onOpenRelated(movie.movieSlug) },
                                onFocused = {
                                    viewModel.rememberFocus(movie.movieSlug, index, "detail-related")
                                },
                                modifier = Modifier
                                    .focusRequester(movieFocusRequester)
                                    .focusProperties {
                                        up = relatedUpFocusRequester
                                        if (index == 0) left = railFocusRequester
                                    },
                            )
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(PhevoTvDimensions.Space2XL)) }
    }
}
