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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
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
        contentPadding = PaddingValues(vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        item {
            Box(Modifier.fillMaxWidth().height(260.dp).background(PhevoTvColors.SurfacePrimary)) {
                FakeArtwork(detail.movie.backdropToken, detail.movie.title, Modifier.fillMaxSize())
                Box(Modifier.fillMaxSize().background(PhevoTvColors.ScrimMedium))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp), verticalAlignment = Alignment.Top) {
                FakeArtwork(detail.movie.posterToken, detail.movie.title, Modifier.width(160.dp).height(240.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(detail.movie.title, style = MaterialTheme.typography.displayMedium, maxLines = 2)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "${detail.movie.year} • ${detail.movie.type.name.lowercase()}${detail.movie.quality?.let { " • $it" } ?: ""}",
                        style = MaterialTheme.typography.labelMedium,
                        color = PhevoTvColors.TextSecondary,
                    )
                    Spacer(Modifier.height(16.dp))
                    Text(detail.synopsis, style = MaterialTheme.typography.bodyLarge, color = PhevoTvColors.TextSecondary, maxLines = 4)
                    Spacer(Modifier.height(20.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        PhevoTvButton("Xem ngay", onPlay, modifier = Modifier.focusRequester(contentFocusRequester))
                        PhevoTvButton("Yêu thích", { onToggleWatchlist(detail.movie.movieSlug) }, primary = false)
                    }
                }
            }
        }
        item {
            Text("Thể loại: ${detail.genres.joinToString(" • ")}", style = MaterialTheme.typography.bodyMedium, color = PhevoTvColors.TextSecondary)
            Text("Quốc gia: ${detail.countries.joinToString(" • ")}", style = MaterialTheme.typography.bodyMedium, color = PhevoTvColors.TextSecondary)
        }
        if (detail.servers.isNotEmpty()) {
            item {
                Text("Nguồn phát", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    detail.servers.forEachIndexed { index, currentServer ->
                        PhevoTvButton(
                            label = currentServer.serverName,
                            onClick = { selectedServer = index },
                            primary = selectedServer == index,
                        )
                    }
                }
            }
            item {
                Text("Danh sách tập", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                LazyRow(
                    modifier = Modifier.fillMaxWidth().focusGroup(),
                    contentPadding = PaddingValues(horizontal = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(server?.episodes.orEmpty(), key = { it.episodeSlug }) { episode ->
                        EpisodeCard(episode, selected = episode == server?.episodes?.firstOrNull(), onClick = {})
                    }
                }
            }
        }
        if (relatedMovies.isNotEmpty()) {
            item {
                Text("Có thể bạn sẽ thích", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                LazyRow(
                    modifier = Modifier.fillMaxWidth().focusGroup(),
                    contentPadding = PaddingValues(horizontal = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(relatedMovies, key = { it.movieSlug }) { movie ->
                        PosterMovieCard(movie, onClick = { onOpenRelated(movie.movieSlug) })
                    }
                }
            }
        }
    }
}
