package com.phevo.tv.ui.player

import android.content.Context
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.HttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.domain.model.PlayerError

class Media3PlaybackControllerFactory(
    private val context: Context,
) : PlaybackControllerFactory {
    override fun create(): PlaybackController = Media3PlaybackController(context.applicationContext)
}

@androidx.annotation.OptIn(UnstableApi::class)
class Media3PlaybackController(
    context: Context,
) : PlaybackController, Player.Listener {
    private val player = ExoPlayer.Builder(context).build().apply {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
            .build()
        setAudioAttributes(audioAttributes, true)
        videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT
        repeatMode = Player.REPEAT_MODE_OFF
        addListener(this@Media3PlaybackController)
    }

    private var listener: PlaybackController.Listener? = null
    private var activeGeneration = 0L
    private var released = false

    override val currentPositionMs: Long
        get() = if (released) 0L else player.currentPosition.coerceAtLeast(0L)

    override val durationMs: Long
        get() = if (released) 0L else player.duration.takeIf { it != C.TIME_UNSET }?.coerceAtLeast(0L) ?: 0L

    override val bufferedPositionMs: Long
        get() = if (released) 0L else player.bufferedPosition.coerceAtLeast(0L)

    override val isPlaying: Boolean
        get() = !released && player.isPlaying

    override fun setListener(listener: PlaybackController.Listener?) {
        this.listener = listener
    }

    override fun prepare(
        generation: Long,
        source: PlaybackSource,
        startPositionMs: Long,
        playWhenReady: Boolean,
    ) {
        check(!released) { "PlaybackController has been released" }
        val mediaItem = when (source) {
            is PlaybackSource.DirectHls -> MediaItem.Builder()
                .setMediaId(generation.toString())
                .setUri(source.url)
                .setMimeType(MimeTypes.APPLICATION_M3U8)
                .build()
            is PlaybackSource.DirectProgressive -> MediaItem.Builder()
                .setMediaId(generation.toString())
                .setUri(source.url)
                .build()
            else -> error("Media3 can prepare only direct playback sources")
        }
        activeGeneration = generation
        player.setMediaItem(mediaItem, startPositionMs.coerceAtLeast(0L))
        player.prepare()
        player.playWhenReady = playWhenReady
    }

    override fun play() {
        if (!released) player.play()
    }

    override fun pause() {
        if (!released) player.pause()
    }

    override fun seekTo(positionMs: Long) {
        if (!released) player.seekTo(positionMs.coerceAtLeast(0L))
    }

    override fun stop() {
        if (!released) player.stop()
    }

    override fun attach(playerView: PlayerView) {
        if (!released) playerView.player = player
    }

    override fun detach(playerView: PlayerView) {
        if (playerView.player === player) playerView.player = null
    }

    override fun release() {
        if (released) return
        released = true
        listener = null
        player.removeListener(this)
        player.release()
    }

    override fun onPlaybackStateChanged(playbackState: Int) {
        val status = when (playbackState) {
            Player.STATE_IDLE -> EnginePlaybackStatus.IDLE
            Player.STATE_BUFFERING -> EnginePlaybackStatus.BUFFERING
            Player.STATE_READY -> EnginePlaybackStatus.READY
            Player.STATE_ENDED -> EnginePlaybackStatus.ENDED
            else -> return
        }
        listener?.onPlaybackStatus(activeGeneration, status)
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        listener?.onIsPlayingChanged(activeGeneration, isPlaying)
    }

    override fun onRenderedFirstFrame() {
        listener?.onFirstFrameRendered(activeGeneration)
    }

    override fun onPlayerError(error: PlaybackException) {
        listener?.onPlaybackError(activeGeneration, Media3PlaybackErrorMapper.map(error))
    }
}

object Media3PlaybackErrorMapper {
    fun map(error: PlaybackException): PlayerError = mapCode(
        errorCode = error.errorCode,
        message = error.message,
        httpStatusCode = (error.cause as? HttpDataSource.InvalidResponseCodeException)?.responseCode,
    )

    fun mapCode(errorCode: Int, message: String? = null, httpStatusCode: Int? = null): PlayerError = when (errorCode) {
        PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT -> PlayerError.Timeout
        PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED -> PlayerError.Network(message)
        PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS -> PlayerError.Http(httpStatusCode ?: 0)
        PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND -> PlayerError.MissingSource("Media source was not found")
        PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED,
        PlaybackException.ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED,
        PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED,
        -> PlayerError.UnsupportedFormat(message)
        PlaybackException.ERROR_CODE_IO_INVALID_HTTP_CONTENT_TYPE,
        PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED,
        PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED,
        -> PlayerError.InvalidSource(message ?: "Invalid media response")
        else -> PlayerError.PlaybackFailure(message)
    }
}
