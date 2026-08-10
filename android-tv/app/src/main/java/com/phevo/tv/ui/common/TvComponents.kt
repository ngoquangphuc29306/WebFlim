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
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvShapes
import com.phevo.tv.app.theme.PhevoTvTypography
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
            .widthIn(min = PhevoTvDimensions.ButtonMinWidth)
            .onFocusChanged { focused = it.isFocused }
            .border(
                width = if (focused) PhevoTvDimensions.FocusOutlineWidth else 0.dp,
                color = if (focused) PhevoTvColors.FocusOutline else Color.Transparent,
                shape = PhevoTvShapes.Button,
            ),
        shape = PhevoTvShapes.Button,
        colors = ButtonDefaults.buttonColors(
            containerColor = when {
                focused && primary -> PhevoTvColors.BrandFocused
                primary -> PhevoTvColors.BrandPrimary
                focused -> PhevoTvColors.SurfaceElevated
                else -> PhevoTvColors.SurfaceSecondary
            },
            contentColor = PhevoTvColors.TextPrimary,
            disabledContainerColor = PhevoTvColors.SurfaceSecondary,
            disabledContentColor = PhevoTvColors.TextDisabled,
        ),
    ) {
        Text(
            label,
            style = PhevoTvTypography.LabelLarge,
            modifier = Modifier.padding(horizontal = PhevoTvDimensions.SpaceSM),
        )
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
                .height(PhevoTvDimensions.PosterHeight)
                .clip(PhevoTvShapes.Card),
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM + 2.dp))
        Text(
            text = movie.title,
            style = PhevoTvTypography.TitleMedium,
            color = PhevoTvColors.TextPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceXS))
        Text(
            text = buildString {
                append(movie.year)
                movie.episodeLabel?.let { append(" • $it") }
            },
            style = PhevoTvTypography.Metadata,
            color = PhevoTvColors.TextMuted,
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
                .height(PhevoTvDimensions.LandscapeHeight)
                .clip(PhevoTvShapes.Card),
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM + 2.dp))
        Text(
            movie.title,
            style = PhevoTvTypography.TitleMedium,
            color = PhevoTvColors.TextPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceXS))
        Text(
            movie.episodeLabel ?: "Tiếp tục xem",
            style = PhevoTvTypography.Metadata,
            color = PhevoTvColors.TextMuted,
        )
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
        FakeArtwork(
            movie.backdropToken,
            movie.title,
            Modifier
                .fillMaxWidth()
                .height(PhevoTvDimensions.LandscapeHeight)
                .clip(PhevoTvShapes.Card),
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM + 2.dp))
        Text(
            movie.title,
            style = PhevoTvTypography.TitleMedium,
            color = PhevoTvColors.TextPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceXS))
        Text(
            movie.episodeLabel ?: "Tiếp tục xem",
            style = PhevoTvTypography.Metadata,
            color = PhevoTvColors.TextMuted,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
        // Progress bar with rounded corners
        Box(
            Modifier
                .fillMaxWidth()
                .height(PhevoTvDimensions.ProgressBarHeight)
                .clip(RoundedCornerShape(PhevoTvDimensions.ProgressBarRadius))
                .background(PhevoTvColors.ProgressTrack),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(progressPercent.coerceIn(0, 100) / 100f)
                    .height(PhevoTvDimensions.ProgressBarHeight)
                    .clip(RoundedCornerShape(PhevoTvDimensions.ProgressBarRadius))
                    .background(PhevoTvColors.ProgressFill),
            )
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
    var focused by remember { mutableStateOf(false) }
    val backgroundColor = when {
        selected && focused -> PhevoTvColors.BrandFocused
        selected -> PhevoTvColors.BrandPrimary
        focused -> PhevoTvColors.SurfaceElevated
        else -> PhevoTvColors.SurfaceSecondary
    }
    val borderColor = when {
        focused -> PhevoTvColors.FocusOutline
        selected -> PhevoTvColors.BrandPrimary
        else -> PhevoTvColors.BorderSubtle
    }
    Box(
        modifier = modifier
            .widthIn(min = PhevoTvDimensions.EpisodeCardMinWidth)
            .height(PhevoTvDimensions.EpisodeCardHeight)
            .clip(PhevoTvShapes.Button)
            .background(backgroundColor, PhevoTvShapes.Button)
            .border(
                width = if (focused || selected) PhevoTvDimensions.FocusOutlineWidth else 1.dp,
                color = borderColor,
                shape = PhevoTvShapes.Button,
            )
            .onFocusChanged { focused = it.isFocused }
            .clickable(onClick = onClick)
            .padding(horizontal = PhevoTvDimensions.SpaceMD),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            episode.name,
            style = PhevoTvTypography.LabelLarge,
            color = if (selected || focused) PhevoTvColors.FocusText else PhevoTvColors.TextPrimary,
        )
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
    var focused by remember { mutableStateOf(false) }
    val backgroundColor = when {
        focused -> PhevoTvColors.SurfaceElevated
        selected -> PhevoTvColors.SurfaceSecondary
        else -> Color.Transparent
    }
    val borderColor = when {
        focused -> PhevoTvColors.FocusOutline
        else -> Color.Transparent
    }
    val textColor = when {
        focused -> PhevoTvColors.FocusText
        selected -> PhevoTvColors.TextPrimary
        else -> PhevoTvColors.TextMuted
    }
    val iconColor = when {
        focused -> PhevoTvColors.BrandFocused
        selected -> PhevoTvColors.BrandPrimary
        else -> PhevoTvColors.TextMuted
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(PhevoTvShapes.Button)
            .background(backgroundColor, PhevoTvShapes.Button)
            .border(
                width = if (focused) PhevoTvDimensions.FocusOutlineWidth else 0.dp,
                color = borderColor,
                shape = PhevoTvShapes.Button,
            )
            .onFocusChanged { focused = it.isFocused }
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp, horizontal = PhevoTvDimensions.SpaceSM),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            iconText,
            style = PhevoTvTypography.TitleMedium,
            color = iconColor,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            label,
            style = PhevoTvTypography.Metadata,
            color = textColor,
            maxLines = 1,
            textAlign = TextAlign.Center,
        )
        // Active indicator bar for selected state
        if (selected) {
            Spacer(Modifier.height(4.dp))
            Box(
                Modifier
                    .width(24.dp)
                    .height(2.dp)
                    .clip(RoundedCornerShape(1.dp))
                    .background(PhevoTvColors.BrandPrimary),
            )
        }
    }
}

@Composable
fun TvLoadingState(modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator(
            color = PhevoTvColors.BrandPrimary,
            trackColor = PhevoTvColors.SurfaceElevated,
            strokeWidth = 3.dp,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
        Text(
            "Đang tải nội dung mẫu…",
            style = PhevoTvTypography.BodyMedium,
            color = PhevoTvColors.TextMuted,
        )
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
    Column(
        modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            "📭",
            style = PhevoTvTypography.DisplayLarge,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
        Text(
            title,
            style = PhevoTvTypography.TitleLarge,
            color = PhevoTvColors.TextPrimary,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
        Text(
            description,
            style = PhevoTvTypography.BodyMedium,
            color = PhevoTvColors.TextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(max = 400.dp),
        )
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(PhevoTvDimensions.SpaceXL))
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
    Column(
        modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            "⚠",
            style = PhevoTvTypography.DisplayLarge,
            color = PhevoTvColors.Error,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
        Text(
            "Không thể tải nội dung",
            style = PhevoTvTypography.TitleLarge,
            color = PhevoTvColors.TextPrimary,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
        Text(
            "Đây là trạng thái lỗi mẫu của TV-1.",
            style = PhevoTvTypography.BodyMedium,
            color = PhevoTvColors.TextSecondary,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceXL))
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
    Box(
        modifier
            .background(color, PhevoTvShapes.Card)
            .clip(PhevoTvShapes.Card),
        contentAlignment = Alignment.Center,
    ) {
        // Subtle bottom gradient for depth
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color(0x40000000)),
                        startY = 0f,
                    ),
                ),
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(PhevoTvDimensions.SpaceMD),
        ) {
            if (token == null) {
                Text(
                    "PHEVO",
                    style = PhevoTvTypography.Metadata,
                    color = PhevoTvColors.BrandPrimary,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(PhevoTvDimensions.SpaceXS))
            }
            Text(
                text = title.take(24),
                style = PhevoTvTypography.TitleMedium,
                color = PhevoTvColors.TextPrimary.copy(alpha = 0.9f),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
        }
    }
}
