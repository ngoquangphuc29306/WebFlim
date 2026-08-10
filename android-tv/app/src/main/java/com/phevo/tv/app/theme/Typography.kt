package com.phevo.tv.app.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object PhevoTvTypography {
    val DisplayLarge = TextStyle(fontSize = 40.sp, lineHeight = 48.sp, fontWeight = FontWeight.Bold)
    val DisplayMedium = TextStyle(fontSize = 32.sp, lineHeight = 40.sp, fontWeight = FontWeight.Bold)
    val TitleLarge = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold)
    val TitleMedium = TextStyle(fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold)
    val BodyLarge = TextStyle(fontSize = 18.sp, lineHeight = 28.sp)
    val BodyMedium = TextStyle(fontSize = 16.sp, lineHeight = 24.sp)
    val LabelLarge = TextStyle(fontSize = 16.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
    val Metadata = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium)

    val Material = Typography(
        displayLarge = DisplayLarge,
        displayMedium = DisplayMedium,
        headlineSmall = TitleLarge,
        titleLarge = TitleLarge,
        titleMedium = TitleMedium,
        bodyLarge = BodyLarge,
        bodyMedium = BodyMedium,
        labelLarge = LabelLarge,
        labelMedium = Metadata,
    )
}
