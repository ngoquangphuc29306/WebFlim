package com.phevo.tv.app.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

object PhevoTvShapes {
    val Card = RoundedCornerShape(8.dp)
    val Panel = RoundedCornerShape(12.dp)
    val Button = RoundedCornerShape(8.dp)
    val Chip = RoundedCornerShape(6.dp)

    val Material = Shapes(
        small = Button,
        medium = Panel,
        large = Panel,
    )
}
