package com.phevo.tv.ui.player

import com.phevo.tv.domain.model.PlaybackBackend
import com.phevo.tv.domain.model.PlaybackSource
import java.net.URI

object PlaybackBackendResolver {
    fun resolve(source: PlaybackSource): PlaybackBackend = when (source) {
        is PlaybackSource.DirectHls,
        is PlaybackSource.DirectProgressive,
        -> PlaybackBackend.NativeMedia3

        is PlaybackSource.UnsupportedEmbed -> PlaybackBackend.EmbeddedWeb
        PlaybackSource.Missing,
        is PlaybackSource.Invalid,
        -> PlaybackBackend.Unavailable
    }
}

/**
 * Limits top-level WebView navigation to the VSMov embed estate observed from
 * provider episode data. Subresources are intentionally left to the provider
 * page; no hidden media URL is inspected or derived by PHEVO.
 */
object EmbedUrlPolicy {
    private const val ProviderEmbedDomain = "streamvsmov.com"

    fun validateInitialUrl(value: String): Decision = validate(value)

    fun isAllowedNavigation(value: String): Boolean = validate(value) is Decision.Allowed

    private fun validate(value: String): Decision = try {
        val uri = URI(value)
        val host = uri.host?.lowercase()
        if (uri.scheme?.lowercase() != "https") {
            Decision.Blocked("Only HTTPS embed URLs are allowed")
        } else if (host.isNullOrBlank() || !isProviderEmbedHost(host)) {
            Decision.Blocked("Embed host is not allowed")
        } else {
            Decision.Allowed(uri.toASCIIString())
        }
    } catch (_: Exception) {
        Decision.Blocked("Embed URL is malformed")
    }

    private fun isProviderEmbedHost(host: String): Boolean =
        host == ProviderEmbedDomain || host.endsWith(".$ProviderEmbedDomain")

    sealed interface Decision {
        data class Allowed(val url: String) : Decision
        data class Blocked(val reason: String) : Decision
    }
}
