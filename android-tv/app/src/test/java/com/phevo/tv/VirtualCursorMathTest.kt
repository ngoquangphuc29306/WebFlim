package com.phevo.tv

import com.phevo.tv.ui.player.VirtualCursorDirection
import com.phevo.tv.ui.player.VirtualCursorMath
import com.phevo.tv.ui.player.VirtualCursorPosition
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class VirtualCursorMathTest {
    @Test
    fun startsAtViewportCenter() {
        assertEquals(VirtualCursorPosition(960f, 540f), VirtualCursorMath.center(1920, 1080))
    }

    @Test
    fun directionalMovementUsesViewportRelativeStep() {
        val start = VirtualCursorMath.center(1920, 1080)
        val moved = VirtualCursorMath.move(start, VirtualCursorDirection.RIGHT, 1920, 1080)
        assertTrue(moved.x > start.x)
        assertEquals(start.y, moved.y)
    }

    @Test
    fun movementIsClampedInsideViewport() {
        val left = VirtualCursorMath.move(
            VirtualCursorPosition(0f, 0f),
            VirtualCursorDirection.LEFT,
            1920,
            1080,
        )
        val bottomRight = VirtualCursorMath.move(
            VirtualCursorPosition(3000f, 3000f),
            VirtualCursorDirection.DOWN,
            1920,
            1080,
        )
        assertTrue(left.x >= 0f && left.y >= 0f)
        assertTrue(bottomRight.x <= 1920f && bottomRight.y <= 1080f)
    }

    @Test
    fun repeatedMovementAcceleratesConservatively() {
        val start = VirtualCursorMath.center(1920, 1080)
        val normal = VirtualCursorMath.move(start, VirtualCursorDirection.RIGHT, 1920, 1080, 0)
        val repeated = VirtualCursorMath.move(start, VirtualCursorDirection.RIGHT, 1920, 1080, 5)
        assertTrue(repeated.x > normal.x)
        assertEquals(normal.y, repeated.y)
    }
}
