package com.phevo.tv.ui.player

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.http.SslError
import android.os.Build
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
        activeWebView = null
    }
}

@Composable
fun rememberEmbedPlaybackHostState(): EmbedPlaybackHostState = remember { EmbedPlaybackHostState() }

/**
 * A constrained host for the official provider embed page. It has no JavaScript
 * bridge and never inspects provider content or derives a direct stream URL.
 */
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
        LaunchedEffect(decision) { onLoadFailure((decision as EmbedUrlPolicy.Decision.Blocked).reason) }
        return
    }

    AndroidView(
        factory = { context ->
            val container = FrameLayout(context)
            val customViewContainer = FrameLayout(context).apply {
                visibility = View.GONE
            }
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
                    hostState.setCustomViewCloser(::hideCustomView)
                }

                override fun onHideCustomView() {
                    hideCustomView()
                }

                override fun onPermissionRequest(request: PermissionRequest) {
                    request.deny()
                }

                fun hideCustomView() {
                    val activeView = customView ?: return
                    customViewContainer.removeView(activeView)
                    customViewContainer.visibility = View.GONE
                    customView = null
                    customViewCallback?.onCustomViewHidden()
                    customViewCallback = null
                    hostState.setCustomViewCloser(null)
                }
            }

            val webView = WebView(context).apply {
                setBackgroundColor(Color.BLACK)
                isFocusable = true
                isFocusableInTouchMode = true
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    allowFileAccess = false
                    allowContentAccess = false
                    mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                    javaScriptCanOpenWindowsAutomatically = false
                    setSupportMultipleWindows(false)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        safeBrowsingEnabled = true
                    }
                }
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        if (!request.isForMainFrame) return false
                        if (EmbedUrlPolicy.isAllowedNavigation(request.url.toString())) return false
                        onLoadFailure("Trang nhúng đã yêu cầu điều hướng không được phép")
                        return true
                    }

                    override fun onPageFinished(view: WebView, url: String) {
                        super.onPageFinished(view, url)
                        view.post { view.requestFocus() }
                    }

                    override fun onReceivedError(
                        view: WebView,
                        request: WebResourceRequest,
                        error: WebResourceError,
                    ) {
                        if (request.isForMainFrame) {
                            onLoadFailure("Không thể tải trang nhúng")
                        }
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
                setDownloadListener { _, _, _, _, _ ->
                    // Embed playback must not turn PHEVO into a download browser.
                }
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
        onRelease = {
            hostState.dispose()
        },
        modifier = modifier,
    )

    // AndroidView owns the WebView. Lifecycle callbacks apply to all child
    // WebViews without introducing a JavaScript pause/play bridge.
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
