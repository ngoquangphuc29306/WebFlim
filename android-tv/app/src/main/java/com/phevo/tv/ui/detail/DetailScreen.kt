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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
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

@Composable
fun DetailScreen(
    movieSlug: String,
    viewModel: DetailViewModel,
    contentFocusRequester: FocusRequester,
    onPlay: () -> Unit,
    onToggleWatchlist: (String) -> Unit,
    onOpenRelated: (String) -> Unit,
) {
    LaunchedEffect(movieSlug) { viewModel.load(movieSlug) }
    val detail by viewModel.movieDetail.collectAsStateWithLifecycle()
    val relatedMovies by viewModel.relatedMovies.collectAsStateWithLifecycle()

    if (detail == null) {
        TvErrorState(onRetry = { viewModel.load(movieSlug) }, initialFocusRequester = contentFocusRequester)
        return
    }

    DetailContent(
        detail = detail!!,
        relatedMovies = relatedMovies,
        contentFocusRequester = contentFocusRequester,
        onPlay = onPlay,
        onToggleWatchlist = onToggleWatchlist,
        onOpenRelated = onOpenRelated,
    )
}

@Composable
private fun DetailContent(
    detail: MovieDetail,
    relatedMovies: List<com.phevo.tv.domain.model.Movie>,
    contentFocusRequester: FocusRequester,
    onPlay: () -> Unit,
    onToggleWatchlist: (String) -> Unit,
    onOpenRelated: (String) -> Unit,
) {
    LaunchedEffect(detail.movie.movieSlug) {
        contentFocusRequester.requestFocus()
    }
    var selectedServer by remember(detail.movie.movieSlug) { mutableIntStateOf(0) }
    val server = detail.servers.getOrNull(selectedServer)

    LazyColumn(
        modifier = Modifier.fillMaxSize().focusGroup(),
        verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
    ) {
        // Cinematic backdrop with directional scrim
        item {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(PhevoTvDimensions.DetailBackdropHeight),
            ) {
                FakeArtwork(
                    detail.movie.backdropToken,
                    detail.movie.title,
                    Modifier.fillMaxSize(),
                )
                // Bottom-to-top scrim for text legibility
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    PhevoTvColors.ScrimLight,
                                    PhevoTvColors.ScrimStrong,
                                ),
                            ),
                        ),
                )
            }
        }

        // Poster + metadata + CTAs
        item {
            Row(
                modifier = Modifier.padding(horizontal = PhevoTvDimensions.SafeAreaHorizontal),
                horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceLG),
                verticalAlignment = Alignment.Top,
            ) {
                FakeArtwork(
                    detail.movie.posterToken,
                    detail.movie.title,
                    Modifier
                        .width(PhevoTvDimensions.DetailPosterWidth)
                        .height(PhevoTvDimensions.DetailPosterHeight)
                        .clip(PhevoTvShapes.Card),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        detail.movie.title,
                        style = PhevoTvTypography.DisplayMedium,
                        color = PhevoTvColors.TextPrimary,
                        maxLines = 2,
                    )
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
                    Text(
                        buildString {
                            append(detail.movie.year)
                            append(" • ")
                            append(detail.movie.type.name.lowercase().replaceFirstChar { it.uppercase() })
                            detail.movie.quality?.let { append(" • $it") }
                            detail.movie.rating?.let { append(" • ★ $it") }
                        },
                        style = PhevoTvTypography.Metadata,
                        color = PhevoTvColors.TextSecondary,
                    )
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
                    Text(
                        detail.synopsis,
                        style = PhevoTvTypography.BodyLarge,
                        color = PhevoTvColors.TextSecondary,
                        maxLines = 4,
                    )
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
                    Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD)) {
                        PhevoTvButton(
                            "▶  Xem ngay",
                            onPlay,
                            modifier = Modifier.focusRequester(contentFocusRequester),
                        )
                        PhevoTvButton(
                            "♡  Yêu thích",
                            { onToggleWatchlist(detail.movie.movieSlug) },
                            primary = false,
                        )
                    }
                }
            }
        }

        // Genre + Country metadata
        item {
            Column(
                modifier = Modifier.padding(horizontal = PhevoTvDimensions.SafeAreaHorizontal),
                verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
            ) {
                if (detail.genres.isNotEmpty()) {
                    Text(
                        "Thể loại: ${detail.genres.joinToString(" • ")}",
                        style = PhevoTvTypography.BodyMedium,
                        color = PhevoTvColors.TextMuted,
                    )
                }
                if (detail.countries.isNotEmpty()) {
                    Text(
                        "Quốc gia: ${detail.countries.joinToString(" • ")}",
                        style = PhevoTvTypography.BodyMedium,
                        color = PhevoTvColors.TextMuted,
                    )
                }
                if (detail.directors.isNotEmpty()) {
                    Text(
                        "Đạo diễn: ${detail.directors.joinToString(", ")}",
                        style = PhevoTvTypography.BodyMedium,
                        color = PhevoTvColors.TextMuted,
                    )
                }
                if (detail.actors.isNotEmpty()) {
                    Text(
                        "Diễn viên: ${detail.actors.joinToString(", ")}",
                        style = PhevoTvTypography.BodyMedium,
                        color = PhevoTvColors.TextMuted,
                    )
                }
            }
        }

        // Server selector
        if (detail.servers.isNotEmpty()) {
            item {
                Column(modifier = Modifier.padding(horizontal = PhevoTvDimensions.SafeAreaHorizontal)) {
                    Text(
                        "Nguồn phát",
                        style = PhevoTvTypography.TitleLarge,
                        color = PhevoTvColors.TextPrimary,
                    )
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
                    Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD)) {
                        detail.servers.forEachIndexed { index, currentServer ->
                            PhevoTvButton(
                                label = currentServer.serverName,
                                onClick = { selectedServer = index },
                                primary = selectedServer == index,
                            )
                        }
                    }
                }
            }

            // Episode list
            item {
                Column(modifier = Modifier.padding(start = PhevoTvDimensions.SafeAreaHorizontal)) {
                    Text(
                        "Danh sách tập",
                        style = PhevoTvTypography.TitleLarge,
                        color = PhevoTvColors.TextPrimary,
                    )
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
                    LazyRow(
                        modifier = Modifier.fillMaxWidth().focusGroup(),
                        contentPadding = PaddingValues(end = PhevoTvDimensions.SafeAreaHorizontal),
                        horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
                    ) {
                        items(server?.episodes.orEmpty(), key = { it.episodeSlug }) { episode ->
                            EpisodeCard(
                                episode,
                                selected = episode == server?.episodes?.firstOrNull(),
                                onClick = {},
                            )
                        }
                    }
                }
            }
        }

        // Related movies
        if (relatedMovies.isNotEmpty()) {
            item {
                Column(modifier = Modifier.padding(start = PhevoTvDimensions.SafeAreaHorizontal)) {
                    Text(
                        "Có thể bạn sẽ thích",
                        style = PhevoTvTypography.TitleLarge,
                        color = PhevoTvColors.TextPrimary,
                    )
                    Spacer(Modifier.height(PhevoTvDimensions.RowTitleBottomSpacing))
                    LazyRow(
                        modifier = Modifier.fillMaxWidth().focusGroup(),
                        contentPadding = PaddingValues(end = PhevoTvDimensions.SafeAreaHorizontal),
                        horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.CardGap),
                    ) {
                        items(relatedMovies, key = { it.movieSlug }) { movie ->
                            PosterMovieCard(movie, onClick = { onOpenRelated(movie.movieSlug) })
                        }
                    }
                }
            }
        }

        // Bottom safe area
        item {
            Spacer(Modifier.height(PhevoTvDimensions.Space2XL))
        }
    }
}
