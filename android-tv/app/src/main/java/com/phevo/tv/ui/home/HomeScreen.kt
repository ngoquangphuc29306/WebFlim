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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
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
        contentPadding = PaddingValues(vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(32.dp),
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
            .height(340.dp)
            .background(PhevoTvColors.SurfacePrimary),
    ) {
        FakeArtwork(movie.backdropToken, movie.title, Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(PhevoTvColors.ScrimMedium))
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(32.dp)
                .fillMaxWidth(0.62f),
        ) {
            Text(movie.quality ?: "PHEVO TV", style = MaterialTheme.typography.labelLarge, color = PhevoTvColors.BrandFocused)
            Spacer(Modifier.height(8.dp))
            Text(movie.title, style = MaterialTheme.typography.displayMedium, maxLines = 2)
            Spacer(Modifier.height(8.dp))
            Text("${movie.year} • ${movie.type.name.lowercase()}", style = MaterialTheme.typography.labelMedium, color = PhevoTvColors.TextSecondary)
            Spacer(Modifier.height(12.dp))
            Text(
                "Khám phá câu chuyện mới trong không gian xem phim tập trung cho Android TV.",
                style = MaterialTheme.typography.bodyLarge,
                color = PhevoTvColors.TextSecondary,
                maxLines = 3,
            )
            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                PhevoTvButton("Xem ngay", onPlay, modifier = Modifier.focusRequester(contentFocusRequester))
                PhevoTvButton("Chi tiết", onDetail, primary = false)
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
        Text(title, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(12.dp))
        LazyRow(
            state = rememberLazyListState(),
            modifier = Modifier
                .fillMaxWidth()
                .focusGroup(),
            contentPadding = PaddingValues(horizontal = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
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
