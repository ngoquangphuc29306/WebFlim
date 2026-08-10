package com.phevo.tv.ui.common

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvMotion
import com.phevo.tv.app.theme.PhevoTvShapes

@Composable
fun Modifier.phevoFocusedSurface(
    enabled: Boolean = true,
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
        .padding(6.dp)
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
            shadowElevation = if (focused) 6.dp.toPx() else 0f
        }
        .clip(clipShape)
        .border(
            width = if (focused) 2.dp else 1.dp,
            color = if (focused) PhevoTvColors.FocusOutline else PhevoTvColors.BorderSubtle,
            shape = clipShape,
        )
        .onFocusChanged {
            focused = it.isFocused
            onFocused(it.isFocused)
        }
        .focusable(enabled)
}
