package com.phevo.tv.app.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val PhevoDarkScheme = darkColorScheme(
    primary = PhevoTvColors.BrandPrimary,
    onPrimary = PhevoTvColors.TextPrimary,
    secondary = PhevoTvColors.SurfaceElevated,
    onSecondary = PhevoTvColors.TextPrimary,
    background = PhevoTvColors.AppBackground,
    onBackground = PhevoTvColors.TextPrimary,
    surface = PhevoTvColors.SurfacePrimary,
    onSurface = PhevoTvColors.TextPrimary,
    surfaceVariant = PhevoTvColors.SurfaceSecondary,
    onSurfaceVariant = PhevoTvColors.TextSecondary,
    error = PhevoTvColors.Error,
)

@Composable
fun PhevoTvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PhevoDarkScheme,
        typography = PhevoTvTypography.Material,
        shapes = PhevoTvShapes.Material,
        content = content,
    )
}
