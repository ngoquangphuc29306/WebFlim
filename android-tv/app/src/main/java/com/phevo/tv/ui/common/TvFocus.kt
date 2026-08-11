package com.phevo.tv.ui.common

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvMotion
import com.phevo.tv.app.theme.PhevoTvShapes

@Composable
fun Modifier.phevoFocusedSurface(
    clipShape: androidx.compose.ui.graphics.Shape = PhevoTvShapes.Card,
    onFocused: (Boolean) -> Unit = {},
): Modifier {
    var focused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (focused) 1.06f else 1f,
        animationSpec = tween(PhevoTvMotion.FocusDurationMillis),
        label = "focus-scale",
    )

    return this
        .padding(PhevoTvDimensions.FocusClipPadding)
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
            shadowElevation = if (focused) 6f else 0f
            shape = clipShape
            clip = false
        }
        .clip(clipShape)
        .background(
            if (focused) PhevoTvColors.FocusSurface else Color.Transparent,
            clipShape,
        )
        .border(
            width = if (focused) PhevoTvDimensions.FocusOutlineWidth else PhevoTvDimensions.SpaceXS * 0,
            color = if (focused) PhevoTvColors.FocusOutline else Color.Transparent,
            shape = clipShape,
        )
        .onFocusChanged {
            focused = it.isFocused
            onFocused(it.isFocused)
        }
}
