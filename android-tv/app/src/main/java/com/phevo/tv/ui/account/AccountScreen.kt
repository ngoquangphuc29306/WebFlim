package com.phevo.tv.ui.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.ui.common.PhevoTvButton

@Composable
fun AccountScreen(contentFocusRequester: FocusRequester) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(PhevoTvDimensions.Space2XL),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        // Brand identity
        Text(
            "PHEVO",
            style = PhevoTvTypography.TitleLarge,
            color = PhevoTvColors.BrandPrimary,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))

        Text(
            "Tài khoản",
            style = PhevoTvTypography.DisplayMedium,
            color = PhevoTvColors.TextPrimary,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))

        Text(
            "Chế độ khách",
            style = PhevoTvTypography.TitleMedium,
            color = PhevoTvColors.TextSecondary,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))

        Text(
            "Đăng nhập và đồng bộ sẽ được thiết kế ở TV-5.\nTV-1 không thực hiện OAuth hoặc Supabase.",
            style = PhevoTvTypography.BodyMedium,
            color = PhevoTvColors.TextMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(max = 420.dp),
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceXL))

        PhevoTvButton(
            "Đăng nhập sau",
            onClick = {},
            modifier = Modifier.focusRequester(contentFocusRequester),
            enabled = false,
        )
    }
}
