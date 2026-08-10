package com.phevo.tv.ui.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.ui.common.PhevoTvButton

@Composable
fun AccountScreen(contentFocusRequester: FocusRequester) {
    Column(
        modifier = Modifier.fillMaxSize().padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Tài khoản", style = MaterialTheme.typography.displayMedium)
        Text("Chế độ khách", style = MaterialTheme.typography.titleLarge, color = PhevoTvColors.TextSecondary)
        Text(
            "Đăng nhập và đồng bộ sẽ được thiết kế ở TV-5. TV-1 không thực hiện OAuth hoặc Supabase.",
            style = MaterialTheme.typography.bodyLarge,
            color = PhevoTvColors.TextSecondary,
            modifier = Modifier.padding(top = 16.dp, bottom = 24.dp),
        )
        PhevoTvButton("Đăng nhập sau", onClick = {}, modifier = Modifier.focusRequester(contentFocusRequester), enabled = false)
    }
}
