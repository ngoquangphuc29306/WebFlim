package com.phevo.tv.ui.player

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.http.SslError
import android.os.Build
import android.os.SystemClock
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner

class EmbedPlaybackHostState internal constructor() {
    private var closeCustomView: (() -> Unit)? = null
    private var activeWebView: WebView? = null
    private var activeInputView: View? = null

    fun exitCustomViewIfShowing(): Boolean {
        val closer = closeCustomView ?: return false
        closer()
        return true
    }

    internal fun setCustomViewCloser(closer: (() -> Unit)?) {
        closeCustomView = closer
    }

    internal fun setWebView(webView: WebView?) {
        activeWebView = webView
        activeInputView = webView
    }

    internal fun setCustomInputView(view: View?) {
        activeInputView = view ?: activeWebView
    }

    /** Delivers a generic hover event; it does not inspect or control provider DOM. */
    fun dispatchPointerMove(x: Float, y: Float): Boolean {
        val target = activeInputView ?: return false
        val event = MotionEvent.obtain(
            SystemClock.uptimeMillis(),
            SystemClock.uptimeMillis(),
            MotionEvent.ACTION_HOVER_MOVE,
            x.coerceIn(0f, target.width.toFloat().coerceAtLeast(1f)),
            y.coerceIn(0f, target.height.toFloat().coerceAtLeast(1f)),
            0,
        ).apply { source = android.view.InputDevice.SOURCE_MOUSE }
        return try {
            target.dispatchGenericMotionEvent(event)
        } finally {
            event.recycle()
        }
    }

    /** Delivers a normal pointer click at the cursor's local WebView coordinates. */
    fun dispatchClick(x: Float, y: Float): Boolean {
        val target = activeInputView ?: return false
        val safeX = x.coerceIn(0f, target.width.toFloat().coerceAtLeast(1f))
        val safeY = y.coerceIn(0f, target.height.toFloat().coerceAtLeast(1f))
        val downTime = SystemClock.uptimeMillis()
        val down = MotionEvent.obtain(downTime, downTime, MotionEvent.ACTION_DOWN, safeX, safeY, 0)
        val up = MotionEvent.obtain(downTime, downTime + 40L, MotionEvent.ACTION_UP, safeX, safeY, 0)
        return try {
            target.dispatchTouchEvent(down)
            target.dispatchTouchEvent(up)
        } finally {
            down.recycle()
            up.recycle()
        }
    }

    internal fun onBackground() {
        activeWebView?.onPause()
        activeWebView?.pauseTimers()
    }

    internal fun onForeground() {
        activeWebView?.resumeTimers()
        activeWebView?.onResume()
    }

    internal fun dispose() {
        exitCustomViewIfShowing()
        activeWebView?.apply {
            stopLoading()
            onPause()
            pauseTimers()
            destroy()
        }
        closeCustomView = null
        activeWebView = null
        activeInputView = null
    }
}

@Composable
fun rememberEmbedPlaybackHostState(): EmbedPlaybackHostState = remember { EmbedPlaybackHostState() }

/** A constrained, provider-owned embed host. It has no JavaScript bridge or DOM access. */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun EmbedPlaybackHost(
    embedUrl: String,
    hostState: EmbedPlaybackHostState,
    onLoadFailure: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val decision = remember(embedUrl) { EmbedUrlPolicy.validateInitialUrl(embedUrl) }

    if (decision !is EmbedUrlPolicy.Decision.Allowed) {
        LaunchedEffect(decision) {
            onLoadFailure((decision as EmbedUrlPolicy.Decision.Blocked).reason)
        }
        return
    }

    AndroidView(
        factory = { context ->
            val container = FrameLayout(context)
            val customViewContainer = FrameLayout(context).apply { visibility = View.GONE }
            val chromeClient = object : WebChromeClient() {
                private var customView: View? = null
                private var customViewCallback: CustomViewCallback? = null

                override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                    hideCustomView()
                    customView = view
                    customViewCallback = callback
                    customViewContainer.addView(
                        view,
                        FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT,
                        ),
                    )
                    customViewContainer.visibility = View.VISIBLE
                    hostState.setCustomInputView(view)
                    hostState.setCustomViewCloser(::hideCustomView)
                }

                override fun onHideCustomView() {
                    hideCustomView()
                }

                override fun onPermissionRequest(request: PermissionRequest) {
                    request.deny()
                }

                private fun hideCustomView() {
                    val activeView = customView ?: return
                    customViewContainer.removeView(activeView)
                    customViewContainer.visibility = View.GONE
                    customView = null
                    customViewCallback?.onCustomViewHidden()
                    customViewCallback = null
                    hostState.setCustomInputView(null)
                    hostState.setCustomViewCloser(null)
                }
            }

            val webView = WebView(context).apply {
                setBackgroundColor(Color.BLACK)
                isFocusable = false
                isFocusableInTouchMode = false
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    allowFileAccess = false
                    allowContentAccess = false
                    mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                    javaScriptCanOpenWindowsAutomatically = false
                    setSupportMultipleWindows(false)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) safeBrowsingEnabled = true
                }
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        if (!request.isForMainFrame) return false
                        if (EmbedUrlPolicy.isAllowedNavigation(request.url.toString())) return false
                        onLoadFailure("Trang nhúng đã yêu cầu điều hướng không được phép")
                        return true
                    }

                    override fun onReceivedError(
                        view: WebView,
                        request: WebResourceRequest,
                        error: WebResourceError,
                    ) {
                        if (request.isForMainFrame) onLoadFailure("Không thể tải trang nhúng")
                    }

                    override fun onReceivedHttpError(
                        view: WebView,
                        request: WebResourceRequest,
                        errorResponse: WebResourceResponse,
                    ) {
                        if (request.isForMainFrame && errorResponse.statusCode >= 400) {
                            onLoadFailure("Máy chủ nhúng không phản hồi")
                        }
                    }

                    override fun onReceivedSslError(
                        view: WebView,
                        handler: SslErrorHandler,
                        error: SslError,
                    ) {
                        handler.cancel()
                        onLoadFailure("Kết nối bảo mật tới trang nhúng không hợp lệ")
                    }
                }
                webChromeClient = chromeClient
                setDownloadListener { _, _, _, _, _ -> Unit }
                setOnLongClickListener { true }
                setOnCreateContextMenuListener { _, _, _ -> }
            }
            hostState.setWebView(webView)
            container.addView(
                webView,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                ),
            )
            container.addView(
                customViewContainer,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                ),
            )
            webView.loadUrl(decision.url)
            container
        },
        onRelease = { hostState.dispose() },
        modifier = modifier,
    )

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> hostState.onBackground()
                Lifecycle.Event.ON_START -> hostState.onForeground()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
}
