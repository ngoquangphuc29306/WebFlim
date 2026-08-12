package com.phevo.tv.ui.player

import com.phevo.tv.domain.model.PlaybackBackend
import com.phevo.tv.domain.model.PlaybackSource
import java.net.URI

object PlaybackBackendResolver {
    fun resolve(source: PlaybackSource): PlaybackBackend = when (source) {
        is PlaybackSource.DirectHls -> PlaybackBackend.NativeMedia3
        is PlaybackSource.UnsupportedEmbed -> PlaybackBackend.EmbeddedWeb
        PlaybackSource.Missing,
        PlaybackSource.HlsUnavailable,
        is PlaybackSource.Invalid,
        -> PlaybackBackend.Unavailable
    }
}

/** Restricts top-level embed navigation to the provider host family. */
object EmbedUrlPolicy {
    private const val ProviderEmbedDomain = "streamvsmov.com"

    fun validateInitialUrl(value: String): Decision = validate(value)

    fun isAllowedNavigation(value: String): Boolean = validate(value) is Decision.Allowed

    private fun validate(value: String): Decision = try {
        val uri = URI(value)
        val host = uri.host?.lowercase()
        when {
            uri.scheme?.lowercase() != "https" -> Decision.Blocked("Chỉ cho phép kết nối HTTPS")
            host.isNullOrBlank() || !isProviderEmbedHost(host) -> Decision.Blocked("Host trang phát không được phép")
            else -> Decision.Allowed(uri.toASCIIString())
        }
    } catch (_: Exception) {
        Decision.Blocked("URL trang phát không hợp lệ")
    }

    private fun isProviderEmbedHost(host: String): Boolean =
        host == ProviderEmbedDomain || host.endsWith(".$ProviderEmbedDomain")

    sealed interface Decision {
        data class Allowed(val url: String) : Decision
        data class Blocked(val reason: String) : Decision
    }
}
