package com.phevo.tv.ui.common

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvShapes
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.Movie

@Composable
fun PhevoTvButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    primary: Boolean = true,
    enabled: Boolean = true,
) {
    var focused by remember { mutableStateOf(false) }
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .height(PhevoTvDimensions.ButtonHeight)
            .onFocusChanged { focused = it.isFocused }
            .border(
                width = if (focused) 2.dp else 0.dp,
                color = if (focused) PhevoTvColors.FocusOutline else Color.Transparent,
                shape = PhevoTvShapes.Button,
            ),
        shape = PhevoTvShapes.Button,
        colors = ButtonDefaults.buttonColors(
            containerColor = if (primary) PhevoTvColors.BrandPrimary else PhevoTvColors.SurfaceElevated,
            contentColor = PhevoTvColors.TextPrimary,
            disabledContainerColor = PhevoTvColors.SurfaceSecondary,
            disabledContentColor = PhevoTvColors.TextDisabled,
        ),
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun PosterMovieCard(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onFocused: () -> Unit = {},
) {
    Column(
        modifier = modifier
            .width(PhevoTvDimensions.PosterWidth)
            .phevoFocusedSurface(onFocused = { if (it) onFocused() })
            .clickable(onClick = onClick),
    ) {
        FakeArtwork(
            token = movie.posterToken,
            title = movie.title,
            modifier = Modifier
                .fillMaxWidth()
                .height(PhevoTvDimensions.PosterHeight),
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = movie.title,
            style = MaterialTheme.typography.titleMedium,
            color = PhevoTvColors.TextPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = buildString {
                append(movie.year)
                movie.episodeLabel?.let { append(" • $it") }
            },
            style = MaterialTheme.typography.labelMedium,
            color = PhevoTvColors.TextSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun LandscapeMovieCard(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .width(PhevoTvDimensions.LandscapeWidth)
            .phevoFocusedSurface()
            .clickable(onClick = onClick),
    ) {
        FakeArtwork(
            token = movie.backdropToken,
            title = movie.title,
            modifier = Modifier
                .fillMaxWidth()
                .height(PhevoTvDimensions.LandscapeHeight),
        )
        Spacer(Modifier.height(8.dp))
        Text(movie.title, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(movie.episodeLabel ?: "Tiếp tục xem", style = MaterialTheme.typography.labelMedium, color = PhevoTvColors.TextSecondary)
    }
}

@Composable
fun ContinueWatchingCard(
    movie: Movie,
    progressPercent: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onFocused: () -> Unit = {},
) {
    Column(
        modifier = modifier
            .width(PhevoTvDimensions.LandscapeWidth)
            .phevoFocusedSurface(onFocused = { if (it) onFocused() })
            .clickable(onClick = onClick),
    ) {
        FakeArtwork(movie.backdropToken, movie.title, Modifier.fillMaxWidth().height(PhevoTvDimensions.LandscapeHeight))
        Spacer(Modifier.height(8.dp))
        Text(movie.title, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(movie.episodeLabel ?: "Tiếp tục xem", style = MaterialTheme.typography.labelMedium, color = PhevoTvColors.TextSecondary)
        Spacer(Modifier.height(6.dp))
        Box(Modifier.fillMaxWidth().height(4.dp).background(PhevoTvColors.SurfaceElevated)) {
            Box(Modifier.fillMaxWidth(progressPercent.coerceIn(0, 100) / 100f).height(4.dp).background(PhevoTvColors.BrandPrimary))
        }
    }
}

@Composable
fun EpisodeCard(
    episode: Episode,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val color = if (selected) PhevoTvColors.BrandPrimary else PhevoTvColors.SurfaceElevated
    Box(
        modifier = modifier
            .height(56.dp)
            .phevoFocusedSurface()
            .background(color, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(episode.name, style = MaterialTheme.typography.labelLarge, color = PhevoTvColors.TextPrimary)
    }
}

@Composable
fun NavigationRailItem(
    label: String,
    iconText: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .phevoFocusedSurface(clipShape = PhevoTvShapes.Button)
            .clickable(onClick = onClick)
            .background(if (selected) PhevoTvColors.SurfaceElevated else Color.Transparent, PhevoTvShapes.Button)
            .padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(iconText, style = MaterialTheme.typography.titleLarge, color = if (selected) PhevoTvColors.BrandFocused else PhevoTvColors.TextSecondary)
        Text(label, style = MaterialTheme.typography.labelMedium, color = if (selected) PhevoTvColors.TextPrimary else PhevoTvColors.TextSecondary, maxLines = 1)
    }
}

@Composable
fun TvLoadingState(modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        CircularProgressIndicator(color = PhevoTvColors.BrandPrimary)
        Spacer(Modifier.height(16.dp))
        Text("Đang tải nội dung mẫu…", style = MaterialTheme.typography.bodyLarge, color = PhevoTvColors.TextSecondary)
    }
}

@Composable
fun TvEmptyState(
    title: String,
    description: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    actionModifier: Modifier = Modifier,
    modifier: Modifier = Modifier,
) {
    Column(modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        Text(description, style = MaterialTheme.typography.bodyLarge, color = PhevoTvColors.TextSecondary)
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(24.dp))
            PhevoTvButton(actionLabel, onAction, modifier = actionModifier)
        }
    }
}

@Composable
fun TvErrorState(
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    initialFocusRequester: FocusRequester? = null,
) {
    Column(modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("Không thể tải nội dung", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        Text("Đây là trạng thái lỗi mẫu của TV-1.", style = MaterialTheme.typography.bodyLarge, color = PhevoTvColors.TextSecondary)
        Spacer(Modifier.height(24.dp))
        PhevoTvButton(
            "Thử lại",
            onRetry,
            modifier = initialFocusRequester?.let { Modifier.focusRequester(it) } ?: Modifier,
        )
    }
}

@Composable
fun FakeArtwork(token: String?, title: String, modifier: Modifier = Modifier) {
    val color = when (token) {
        "sea-night", "sea-night-wide" -> Color(0xFF123D52)
        "city" -> Color(0xFF553B65)
        "journey", "journey-wide" -> Color(0xFF75411E)
        "colors-wide" -> Color(0xFF4C5F2D)
        "stars", "stars-wide" -> Color(0xFF263C6B)
        "home", "home-wide" -> Color(0xFF5B3035)
        else -> PhevoTvColors.SurfaceElevated
    }
    Box(modifier.background(color, PhevoTvShapes.Card), contentAlignment = Alignment.Center) {
        Text(
            text = if (token == null) "PHEVO\n${title.take(18)}" else title,
            style = MaterialTheme.typography.titleMedium,
            color = PhevoTvColors.TextPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(16.dp),
        )
    }
}
