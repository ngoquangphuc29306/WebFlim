package com.phevo.tv.ui.player

import androidx.media3.ui.PlayerView
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.domain.model.PlayerError

interface PlaybackControllerFactory {
    fun create(): PlaybackController
}

interface PlaybackController {
    val currentPositionMs: Long
    val durationMs: Long
    val bufferedPositionMs: Long
    val isPlaying: Boolean

    fun setListener(listener: Listener?)

    fun prepare(
        generation: Long,
        source: PlaybackSource,
        startPositionMs: Long,
        playWhenReady: Boolean,
    )

    fun play()
    fun pause()
    fun seekTo(positionMs: Long)
    fun stop()
    fun attach(playerView: PlayerView)
    fun detach(playerView: PlayerView)
    fun release()

    interface Listener {
        fun onPlaybackStatus(generation: Long, status: EnginePlaybackStatus)
        fun onIsPlayingChanged(generation: Long, isPlaying: Boolean)
        fun onFirstFrameRendered(generation: Long)
        fun onPlaybackError(generation: Long, error: PlayerError)
    }
}

enum class EnginePlaybackStatus {
    IDLE,
    BUFFERING,
    READY,
    ENDED,
}
