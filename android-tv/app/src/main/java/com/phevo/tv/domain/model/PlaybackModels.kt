package com.phevo.tv.domain.model

sealed interface PlaybackSource {
    val url: String?

    data class DirectHls(override val url: String) : PlaybackSource
    data class UnsupportedEmbed(override val url: String) : PlaybackSource
    data object HlsUnavailable : PlaybackSource {
        override val url: String? = null
    }
    data object Missing : PlaybackSource {
        override val url: String? = null
    }
    data class Invalid(
        override val url: String?,
        val reason: String,
    ) : PlaybackSource
}

/**
 * The rendering backend selected after a provider source has been classified.
 * Direct HLS remains native; provider embeds are isolated in the WebView backend.
 */
enum class PlaybackBackend {
    NativeMedia3,
    EmbeddedWeb,
    Unavailable,
}

enum class PlaybackStatus {
    IDLE,
    RESOLVING,
    PREPARING,
    BUFFERING,
    READY,
    ENDED,
    UNSUPPORTED,
    ERROR,
}

sealed interface PlayerError {
    data class Network(val message: String? = null) : PlayerError
    data object Timeout : PlayerError
    data class Http(val statusCode: Int) : PlayerError
    data class UnsupportedFormat(val message: String? = null) : PlayerError
    data class InvalidSource(val message: String) : PlayerError
    data class MissingSource(val message: String) : PlayerError
    data class PlaybackFailure(val message: String? = null) : PlayerError
    data class Unknown(val message: String? = null) : PlayerError
}

data class PlaybackProgressEvent(
    val movieSlug: String,
    val episodeSlug: String,
    val positionMs: Long,
    val durationMs: Long,
    val updatedAt: Long,
    val reason: PlaybackProgressReason,
)

enum class PlaybackProgressReason {
    PERIODIC,
    PAUSE,
    SOURCE_SWITCH,
    EXIT,
    ENDED,
}
