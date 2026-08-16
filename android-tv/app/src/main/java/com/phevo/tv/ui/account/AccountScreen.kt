package com.phevo.tv.ui.account

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.domain.auth.AuthError
import com.phevo.tv.domain.auth.AuthState
import com.phevo.tv.ui.common.PhevoTvButton

@Composable
fun AccountScreen(
    viewModel: AuthViewModel,
    contentFocusRequester: FocusRequester,
) {
    val state by viewModel.state.collectAsState()
    DisposableEffect(viewModel) {
        onDispose { viewModel.cancelDeviceLink() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(PhevoTvDimensions.Space2XL),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("PHEVO", style = PhevoTvTypography.TitleLarge, color = PhevoTvColors.BrandPrimary)
        Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
        Text("Tài khoản", style = PhevoTvTypography.DisplayMedium, color = PhevoTvColors.TextPrimary)
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))

        when (val current = state) {
            AuthState.Guest -> GuestContent(
                onStart = viewModel::startDeviceLink,
                modifier = Modifier.focusRequester(contentFocusRequester),
            )
            AuthState.CreatingLink -> ProgressContent("Đang tạo mã liên kết…")
            is AuthState.WaitingForApproval -> WaitingContent(current, viewModel::cancelDeviceLink)
            is AuthState.Authenticated -> AuthenticatedContent(current, viewModel::logout)
            AuthState.Expired -> ExpiredContent(viewModel::startDeviceLink, contentFocusRequester)
            is AuthState.Error -> ErrorContent(current.error, viewModel::startDeviceLink, contentFocusRequester)
        }
    }
}

@Composable
private fun GuestContent(onStart: () -> Unit, modifier: Modifier) {
    Text("Chế độ khách", style = PhevoTvTypography.TitleMedium, color = PhevoTvColors.TextSecondary)
    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
    Text(
        "Liên kết TV bằng QR để đăng nhập và sẵn sàng đồng bộ ở các bước tiếp theo.",
        style = PhevoTvTypography.BodyMedium,
        color = PhevoTvColors.TextMuted,
        textAlign = TextAlign.Center,
        modifier = Modifier.widthIn(max = 520.dp),
    )
    Spacer(Modifier.height(PhevoTvDimensions.SpaceXL))
    PhevoTvButton("Đăng nhập bằng QR", onStart, modifier = modifier)
}

@Composable
private fun ProgressContent(message: String) {
    CircularProgressIndicator(color = PhevoTvColors.BrandPrimary)
    Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
    Text(message, style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextSecondary)
}

@Composable
private fun WaitingContent(state: AuthState.WaitingForApproval, onCancel: () -> Unit) {
    val bitmap = androidx.compose.runtime.remember(state.link.verificationUrl) {
        createQrBitmap(state.link.verificationUrl)
    }
    Row(
        horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceXL),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        bitmap?.let {
            Image(it.asImageBitmap(), contentDescription = "Mã QR liên kết thiết bị", modifier = Modifier.size(220.dp))
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Quét mã QR bằng điện thoại", style = PhevoTvTypography.TitleMedium, color = PhevoTvColors.TextPrimary)
            Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
            Text(state.link.userCode, style = PhevoTvTypography.DisplayMedium, color = PhevoTvColors.BrandPrimary)
            Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
            Text("Đang chờ xác nhận…", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextSecondary)
            Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
            PhevoTvButton("Hủy", onCancel, primary = false)
        }
    }
}

@Composable
private fun AuthenticatedContent(state: AuthState.Authenticated, onLogout: () -> Unit) {
    Text("Đã đăng nhập", style = PhevoTvTypography.TitleMedium, color = PhevoTvColors.TextPrimary)
    Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
    Text("ID: ${state.userId}", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextSecondary)
    Text("Không gian: ${state.namespace}", style = PhevoTvTypography.Metadata, color = PhevoTvColors.TextMuted)
    Spacer(Modifier.height(PhevoTvDimensions.SpaceXL))
    PhevoTvButton("Đăng xuất", onLogout, primary = false)
}

@Composable
private fun ExpiredContent(onRetry: () -> Unit, focusRequester: FocusRequester) {
    Text("Mã liên kết đã hết hạn.", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextSecondary)
    Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
    PhevoTvButton("Tạo mã mới", onRetry, modifier = Modifier.focusRequester(focusRequester))
}

@Composable
private fun ErrorContent(error: AuthError, onRetry: () -> Unit, focusRequester: FocusRequester) {
    Text(authErrorMessage(error), style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextSecondary, textAlign = TextAlign.Center)
    Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
    PhevoTvButton("Thử lại", onRetry, modifier = Modifier.focusRequester(focusRequester))
}

private fun authErrorMessage(error: AuthError): String = when (error) {
    AuthError.Offline -> "Không có kết nối mạng. Vui lòng thử lại."
    AuthError.Timeout -> "Máy chủ phản hồi quá lâu. Vui lòng thử lại."
    AuthError.ExpiredCode -> "Mã liên kết đã hết hạn."
    AuthError.ConsumedCode -> "Mã liên kết đã được sử dụng."
    AuthError.InvalidCode -> "Mã liên kết không hợp lệ."
    AuthError.ServerUnavailable -> "Dịch vụ đăng nhập tạm thời không khả dụng."
    AuthError.RefreshFailed -> "Phiên đăng nhập đã hết hạn. Vui lòng liên kết lại TV."
    AuthError.Configuration -> "Tính năng đăng nhập TV chưa được cấu hình."
    is AuthError.Unexpected -> "Không thể hoàn tất đăng nhập. Vui lòng thử lại."
}

private fun createQrBitmap(value: String): Bitmap? = runCatching {
    val matrix = QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, 220, 220)
    Bitmap.createBitmap(220, 220, Bitmap.Config.ARGB_8888).also { bitmap ->
        for (x in 0 until matrix.width) {
            for (y in 0 until matrix.height) {
                bitmap.setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
            }
        }
    }
}.getOrNull()
