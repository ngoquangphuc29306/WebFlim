package com.phevo.tv.ui.player

import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.PlaybackSource
import java.net.URI

object PlaybackSourceClassifier {
    private val progressiveExtensions = setOf("mp4", "m4v", "webm", "mkv")

    fun classify(episode: Episode): PlaybackSource {
        val direct = episode.m3u8Url?.trim().orEmpty()
        if (direct.isNotEmpty()) return classifyDirect(direct)

        val embed = episode.embedUrl?.trim().orEmpty()
        if (embed.isEmpty()) return PlaybackSource.Missing
        return when (val parsed = parseHttpUrl(embed)) {
            is ParsedUrl.Valid -> PlaybackSource.UnsupportedEmbed(parsed.url)
            is ParsedUrl.Invalid -> PlaybackSource.Invalid(embed, parsed.reason)
        }
    }

    private fun classifyDirect(value: String): PlaybackSource = when (val parsed = parseHttpUrl(value)) {
        is ParsedUrl.Invalid -> PlaybackSource.Invalid(value, parsed.reason)
        is ParsedUrl.Valid -> {
            val extension = parsed.path.substringAfterLast('.', missingDelimiterValue = "").lowercase()
            when {
                extension == "m3u8" -> PlaybackSource.DirectHls(parsed.url)
                extension in progressiveExtensions -> PlaybackSource.DirectProgressive(parsed.url)
                else -> PlaybackSource.Invalid(value, "Direct media URL has no supported media extension")
            }
        }
    }

    private fun parseHttpUrl(value: String): ParsedUrl = try {
        val uri = URI(value)
        val scheme = uri.scheme?.lowercase()
        if ((scheme != "http" && scheme != "https") || uri.host.isNullOrBlank()) {
            ParsedUrl.Invalid("Playback URL must be an absolute HTTP(S) URL")
        } else {
            ParsedUrl.Valid(uri.toASCIIString(), uri.path.orEmpty())
        }
    } catch (_: Exception) {
        ParsedUrl.Invalid("Playback URL is malformed")
    }

    private sealed interface ParsedUrl {
        data class Valid(val url: String, val path: String) : ParsedUrl
        data class Invalid(val reason: String) : ParsedUrl
    }
}
