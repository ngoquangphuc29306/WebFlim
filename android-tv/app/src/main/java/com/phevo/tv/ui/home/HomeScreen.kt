package com.phevo.tv.ui.home

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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.ui.common.ContinueWatchingCard
import com.phevo.tv.ui.common.FakeArtwork
import com.phevo.tv.ui.common.PhevoTvButton
import com.phevo.tv.ui.common.PosterMovieCard
import com.phevo.tv.ui.common.TvEmptyState
import com.phevo.tv.ui.common.TvErrorState
import com.phevo.tv.ui.common.TvLoadingState

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    contentFocusRequester: FocusRequester,
    onOpenMovie: (String) -> Unit,
    onOpenDetail: (String) -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    when (val value = state) {
        HomeUiState.Loading -> TvLoadingState()
        is HomeUiState.Error -> TvErrorState(onRetry = viewModel::load, initialFocusRequester = contentFocusRequester)
        is HomeUiState.Content -> HomeContent(
            value = value.value,
            contentFocusRequester = contentFocusRequester,
            onOpenMovie = onOpenMovie,
            onOpenDetail = onOpenDetail,
            onRememberFocus = viewModel::rememberFocus,
        )
    }
}

@Composable
private fun HomeContent(
    value: com.phevo.tv.domain.model.HomeContent,
    contentFocusRequester: FocusRequester,
    onOpenMovie: (String) -> Unit,
    onOpenDetail: (String) -> Unit,
    onRememberFocus: (String?, Int, String) -> Unit,
) {
    LaunchedEffect(value.heroMovie.movieSlug) {
        contentFocusRequester.requestFocus()
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.RowGap),
    ) {
        item {
            HomeHero(
                movie = value.heroMovie,
                contentFocusRequester = contentFocusRequester,
                onPlay = { onOpenMovie(value.heroMovie.movieSlug) },
                onDetail = { onOpenDetail(value.heroMovie.movieSlug) },
            )
        }
        if (value.continueWatching.isNotEmpty()) {
            item {
                TvMovieRow(
                    title = "Tiếp tục xem",
                    movies = value.continueWatching,
                    continueWatching = true,
                    onOpenMovie = onOpenMovie,
                    onRememberFocus = onRememberFocus,
                )
            }
        }
        item {
            TvMovieRow("Mới cập nhật", value.newMovies, onOpenMovie, onRememberFocus = onRememberFocus)
        }
        item {
            TvMovieRow("Phim bộ", value.series, onOpenMovie, onRememberFocus = onRememberFocus)
        }
        item {
            TvMovieRow("Đề xuất", value.featuredMovies, onOpenMovie, onRememberFocus = onRememberFocus)
        }
        // Bottom safe area
        item {
            Spacer(Modifier.height(PhevoTvDimensions.Space2XL))
        }
    }
}

@Composable
private fun HomeHero(
    movie: Movie,
    contentFocusRequester: FocusRequester,
    onPlay: () -> Unit,
    onDetail: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(PhevoTvDimensions.HeroHeight),
    ) {
        // Full-bleed backdrop artwork
        FakeArtwork(
            movie.backdropToken,
            movie.title,
            Modifier.fillMaxSize(),
        )

        // Directional scrim: strong on left for text, fading to transparent on right
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            PhevoTvColors.ScrimHeroStart,
                            PhevoTvColors.ScrimMedium,
                            PhevoTvColors.ScrimHeroEnd,
                        ),
                        startX = 0f,
                        endX = Float.POSITIVE_INFINITY,
                    ),
                ),
        )

        // Bottom fade for seamless row transition
        Box(
            Modifier
                .fillMaxWidth()
                .height(80.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            PhevoTvColors.ScrimHeroEnd,
                            PhevoTvColors.AppBackground,
                        ),
                    ),
                ),
        )

        // Hero content
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(
                    start = PhevoTvDimensions.SafeAreaHorizontal,
                    end = PhevoTvDimensions.SpaceXL,
                    bottom = PhevoTvDimensions.Space3XL,
                )
                .fillMaxWidth(0.55f),
        ) {
            // Quality badge
            movie.quality?.let { quality ->
                Text(
                    quality,
                    style = PhevoTvTypography.Metadata,
                    color = PhevoTvColors.BrandFocused,
                )
                Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
            }

            // Title — hero uses DisplayLarge per design system
            Text(
                movie.title,
                style = PhevoTvTypography.DisplayLarge,
                color = PhevoTvColors.TextPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))

            // Metadata line
            Text(
                buildString {
                    append(movie.year)
                    append(" • ")
                    append(movie.type.name.lowercase().replaceFirstChar { it.uppercase() })
                    movie.rating?.let { append(" • ★ $it") }
                },
                style = PhevoTvTypography.Metadata,
                color = PhevoTvColors.TextSecondary,
            )

            Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))

            // Synopsis
            Text(
                "Khám phá câu chuyện mới trong không gian xem phim tập trung cho Android TV.",
                style = PhevoTvTypography.BodyLarge,
                color = PhevoTvColors.TextSecondary,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )

            Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))

            // CTAs
            Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD)) {
                PhevoTvButton(
                    "▶  Xem ngay",
                    onPlay,
                    modifier = Modifier.focusRequester(contentFocusRequester),
                )
                PhevoTvButton(
                    "Chi tiết",
                    onDetail,
                    primary = false,
                )
            }
        }
    }
}

@Composable
private fun TvMovieRow(
    title: String,
    movies: List<Movie>,
    onOpenMovie: (String) -> Unit,
    onRememberFocus: (String?, Int, String) -> Unit,
    continueWatching: Boolean = false,
) {
    if (movies.isEmpty()) return
    Column {
        // Row title aligned with content safe area
        Text(
            title,
            style = PhevoTvTypography.TitleLarge,
            color = PhevoTvColors.TextPrimary,
            modifier = Modifier.padding(start = PhevoTvDimensions.SafeAreaHorizontal),
        )
        Spacer(Modifier.height(PhevoTvDimensions.RowTitleBottomSpacing))
        LazyRow(
            state = rememberLazyListState(),
            modifier = Modifier
                .fillMaxWidth()
                .focusGroup(),
            contentPadding = PaddingValues(horizontal = PhevoTvDimensions.SafeAreaHorizontal - PhevoTvDimensions.FocusClipPadding),
            horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.CardGap),
        ) {
            itemsIndexed(movies, key = { _, movie -> movie.movieSlug }) { index, movie ->
                if (continueWatching) {
                    ContinueWatchingCard(
                        movie = movie,
                        progressPercent = 42,
                        onClick = { onOpenMovie(movie.movieSlug) },
                        onFocused = { onRememberFocus(movie.movieSlug, index, title) },
                    )
                } else {
                    PosterMovieCard(
                        movie = movie,
                        onClick = { onOpenMovie(movie.movieSlug) },
                        onFocused = { onRememberFocus(movie.movieSlug, index, title) },
                    )
                }
            }
        }
    }
}
