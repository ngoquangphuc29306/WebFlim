package com.phevo.tv.ui.player

data class VirtualCursorPosition(
    val x: Float,
    val y: Float,
)

enum class VirtualCursorDirection {
    LEFT,
    RIGHT,
    UP,
    DOWN,
}

object VirtualCursorMath {
    private const val DefaultStepFraction = 0.055f
    private const val MinimumStepPx = 24f
    private const val EdgeMarginPx = 4f

    fun center(width: Int, height: Int): VirtualCursorPosition = VirtualCursorPosition(
        x = width.coerceAtLeast(0) / 2f,
        y = height.coerceAtLeast(0) / 2f,
    )

    fun move(
        position: VirtualCursorPosition,
        direction: VirtualCursorDirection,
        width: Int,
        height: Int,
        repeatCount: Int = 0,
    ): VirtualCursorPosition {
        val step = maxOf(
            MinimumStepPx,
            minOf(width.coerceAtLeast(1), height.coerceAtLeast(1)) * DefaultStepFraction,
        ) * if (repeatCount >= 5) 1.35f else 1f
        val moved = when (direction) {
            VirtualCursorDirection.LEFT -> position.copy(x = position.x - step)
            VirtualCursorDirection.RIGHT -> position.copy(x = position.x + step)
            VirtualCursorDirection.UP -> position.copy(y = position.y - step)
            VirtualCursorDirection.DOWN -> position.copy(y = position.y + step)
        }
        return clamp(moved, width, height)
    }

    fun clamp(position: VirtualCursorPosition, width: Int, height: Int): VirtualCursorPosition {
        val maxX = (width - EdgeMarginPx).coerceAtLeast(EdgeMarginPx)
        val maxY = (height - EdgeMarginPx).coerceAtLeast(EdgeMarginPx)
        return VirtualCursorPosition(
            x = position.x.coerceIn(EdgeMarginPx, maxX),
            y = position.y.coerceIn(EdgeMarginPx, maxY),
        )
    }
}
