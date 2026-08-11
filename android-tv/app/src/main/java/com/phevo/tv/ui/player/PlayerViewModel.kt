package com.phevo.tv.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.ui.PlayerView
import com.phevo.tv.domain.model.DataError
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.PlaybackProgressEvent
import com.phevo.tv.domain.model.PlaybackProgressReason
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.domain.model.PlaybackStatus
import com.phevo.tv.domain.model.PlayerError
import com.phevo.tv.domain.model.PlayerSelection
import com.phevo.tv.domain.model.Server
import com.phevo.tv.domain.repository.MovieRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class PlayerUiState(
    val movieSlug: String = "",
    val episodeSlug: String? = null,
    val episodeName: String? = null,
    val serverIndex: Int? = null,
    val serverName: String? = null,
    val servers: List<Server> = emptyList(),
    val playbackStatus: PlaybackStatus = PlaybackStatus.IDLE,
    val source: PlaybackSource = PlaybackSource.Missing,
    val isPlaying: Boolean = false,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val bufferedPositionMs: Long = 0L,
    val hasRenderedFirstFrame: Boolean = false,
    val error: PlayerError? = null,
    val hasPreviousEpisode: Boolean = false,
    val hasNextEpisode: Boolean = false,
    val canRetry: Boolean = false,
    val sourceGeneration: Long = 0L,
)

class PlayerViewModel(
    private val repository: MovieRepository,
    private val controllerFactory: PlaybackControllerFactory,
    private val now: () -> Long = System::currentTimeMillis,
) : ViewModel(), PlaybackController.Listener {
    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    private val _progressEvents = MutableSharedFlow<PlaybackProgressEvent>(extraBufferCapacity = 16)
    val progressEvents: SharedFlow<PlaybackProgressEvent> = _progressEvents.asSharedFlow()

    private var controller: PlaybackController? = null
    private var detail: MovieDetail? = null
    private var resolveJob: Job? = null
    private var progressJob: Job? = null
    private var requestGeneration = 0L
    private var sourceGeneration = 0L
    private var lastPeriodicProgressAt = 0L
    private var released = false

    fun start(selection: PlayerSelection, initialPositionMs: Long = 0L) {
        released = false
        val request = ++requestGeneration
        resolveJob?.cancel()
        ensureController()
        _state.value = PlayerUiState(
            movieSlug = selection.movieSlug,
            episodeSlug = selection.episodeSlug,
            serverIndex = selection.serverIndex,
            serverName = selection.serverName,
            playbackStatus = PlaybackStatus.RESOLVING,
        )
        resolveJob = viewModelScope.launch {
            try {
                when (val result = repository.getMovieDetail(selection.movieSlug)) {
                    is DataResult.Failure -> if (request == requestGeneration) {
                        fail(mapDataError(result.error))
                    }
                    is DataResult.Success -> if (request == requestGeneration) {
                        detail = result.value
                        resolveInitialSelection(result.value, selection, initialPositionMs)
                    }
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            }
        }
    }

    fun play() {
        controller?.play()
        refreshProgress()
    }

    fun pause() {
        controller?.pause()
        refreshProgress()
        emitProgress(PlaybackProgressReason.PAUSE)
    }

    fun seekTo(positionMs: Long) {
        val duration = _state.value.durationMs
        val target = if (duration > 0L) positionMs.coerceIn(0L, duration) else positionMs.coerceAtLeast(0L)
        controller?.seekTo(target)
        _state.value = _state.value.copy(positionMs = target)
    }

    fun seekForward() = seekTo(_state.value.positionMs + SeekIncrementMs)

    fun seekBack() = seekTo(_state.value.positionMs - SeekIncrementMs)

    fun playPreviousEpisode() {
        val current = currentServer() ?: return
        val index = current.episodes.indexOfFirst { it.episodeSlug == _state.value.episodeSlug }
        if (index > 0) switchEpisode(current.episodes[index - 1].episodeSlug)
    }

    fun playNextEpisode() {
        val current = currentServer() ?: return
        val index = current.episodes.indexOfFirst { it.episodeSlug == _state.value.episodeSlug }
        if (index >= 0 && index < current.episodes.lastIndex) {
            switchEpisode(current.episodes[index + 1].episodeSlug)
        }
    }

    fun switchEpisode(episodeSlug: String) {
        val server = currentServer() ?: return
        val episode = server.episodes.firstOrNull { it.episodeSlug == episodeSlug }
            ?: return fail(PlayerError.MissingSource("Episode is not available on the selected server"))
        emitProgress(PlaybackProgressReason.SOURCE_SWITCH)
        prepareEpisode(server, _state.value.serverIndex ?: 0, episode, 0L)
    }

    fun switchServer(serverIndex: Int) {
        val movieDetail = detail ?: return
        val server = movieDetail.servers.getOrNull(serverIndex)
            ?: return fail(PlayerError.InvalidSource("Selected server does not exist"))
        val currentSlug = _state.value.episodeSlug
        val matchingEpisode = currentSlug?.let { slug -> server.episodes.firstOrNull { it.episodeSlug == slug } }
        val episode = matchingEpisode ?: server.episodes.firstOrNull()
            ?: return fail(PlayerError.MissingSource("Selected server has no episodes"))
        val preservedPosition = if (matchingEpisode != null) currentPosition() else 0L
        emitProgress(PlaybackProgressReason.SOURCE_SWITCH)
        prepareEpisode(server, serverIndex, episode, preservedPosition)
    }

    fun retryCurrentSource() {
        val source = _state.value.source
        if (source !is PlaybackSource.DirectHls && source !is PlaybackSource.DirectProgressive) return
        val position = currentPosition()
        val generation = ++sourceGeneration
        _state.value = _state.value.copy(
            playbackStatus = PlaybackStatus.PREPARING,
            error = null,
            canRetry = false,
            sourceGeneration = generation,
        )
        controller?.prepare(generation, source, position, playWhenReady = true)
    }

    fun onBackground() {
        if (_state.value.isPlaying) pause()
    }

    fun onForeground() = Unit

    fun attach(playerView: PlayerView) {
        controller?.attach(playerView)
    }

    fun detach(playerView: PlayerView) {
        controller?.detach(playerView)
    }

    fun closeSession() {
        if (released) return
        released = true
        emitProgress(PlaybackProgressReason.EXIT)
        requestGeneration++
        sourceGeneration++
        resolveJob?.cancel()
        resolveJob = null
        stopProgressPolling()
        controller?.setListener(null)
        controller?.release()
        controller = null
        detail = null
        _state.value = PlayerUiState()
    }

    override fun onPlaybackStatus(generation: Long, status: EnginePlaybackStatus) {
        if (generation != sourceGeneration || released) return
        val mapped = when (status) {
            EnginePlaybackStatus.IDLE -> PlaybackStatus.PREPARING
            EnginePlaybackStatus.BUFFERING -> PlaybackStatus.BUFFERING
            EnginePlaybackStatus.READY -> PlaybackStatus.READY
            EnginePlaybackStatus.ENDED -> PlaybackStatus.ENDED
        }
        refreshProgress()
        _state.value = _state.value.copy(playbackStatus = mapped)
        if (mapped == PlaybackStatus.ENDED) {
            stopProgressPolling()
            emitProgress(PlaybackProgressReason.ENDED)
        }
    }

    override fun onIsPlayingChanged(generation: Long, isPlaying: Boolean) {
        if (generation != sourceGeneration || released) return
        refreshProgress()
        _state.value = _state.value.copy(isPlaying = isPlaying)
        if (isPlaying) startProgressPolling() else stopProgressPolling()
    }

    override fun onFirstFrameRendered(generation: Long) {
        if (generation != sourceGeneration || released) return
        _state.value = _state.value.copy(hasRenderedFirstFrame = true)
    }

    override fun onPlaybackError(generation: Long, error: PlayerError) {
        if (generation != sourceGeneration || released) return
        stopProgressPolling()
        refreshProgress()
        _state.value = _state.value.copy(
            playbackStatus = PlaybackStatus.ERROR,
            isPlaying = false,
            error = error,
            canRetry = true,
        )
    }

    override fun onCleared() {
        closeSession()
        super.onCleared()
    }

    private fun ensureController(): PlaybackController {
        val existing = controller
        if (existing != null) return existing
        return controllerFactory.create().also {
            controller = it
            it.setListener(this)
        }
    }

    private fun resolveInitialSelection(
        movieDetail: MovieDetail,
        selection: PlayerSelection,
        initialPositionMs: Long,
    ) {
        val serverResolution = resolveServer(movieDetail.servers, selection)
            ?: return fail(PlayerError.InvalidSource("Selected server could not be resolved"))
        val episode = if (selection.episodeSlug == null) {
            serverResolution.server.episodes.firstOrNull()
        } else {
            serverResolution.server.episodes.firstOrNull { it.episodeSlug == selection.episodeSlug }
        } ?: return fail(PlayerError.MissingSource("Selected episode could not be resolved"))
        prepareEpisode(serverResolution.server, serverResolution.index, episode, initialPositionMs)
    }

    private fun resolveServer(servers: List<Server>, selection: PlayerSelection): ResolvedServer? {
        if (servers.isEmpty()) return null
        val byIndex = selection.serverIndex?.let(servers::getOrNull)
        if (byIndex != null && (selection.serverName == null || selection.serverName == byIndex.serverName)) {
            return ResolvedServer(selection.serverIndex, byIndex)
        }
        if (selection.serverName != null) {
            val index = servers.indexOfFirst { it.serverName == selection.serverName }
            if (index >= 0) return ResolvedServer(index, servers[index])
            return null
        }
        if (selection.serverIndex != null) return null
        return ResolvedServer(0, servers.first())
    }

    private fun prepareEpisode(
        server: Server,
        serverIndex: Int,
        episode: Episode,
        startPositionMs: Long,
    ) {
        val source = PlaybackSourceClassifier.classify(episode)
        val generation = ++sourceGeneration
        stopProgressPolling()
        controller?.stop()
        val episodeIndex = server.episodes.indexOfFirst { it.episodeSlug == episode.episodeSlug }
        _state.value = _state.value.copy(
            episodeSlug = episode.episodeSlug,
            episodeName = episode.name,
            serverIndex = serverIndex,
            serverName = server.serverName,
            servers = detail?.servers.orEmpty(),
            source = source,
            isPlaying = false,
            positionMs = startPositionMs.coerceAtLeast(0L),
            durationMs = 0L,
            bufferedPositionMs = 0L,
            hasRenderedFirstFrame = false,
            error = null,
            hasPreviousEpisode = episodeIndex > 0,
            hasNextEpisode = episodeIndex >= 0 && episodeIndex < server.episodes.lastIndex,
            sourceGeneration = generation,
        )
        when (source) {
            is PlaybackSource.DirectHls,
            is PlaybackSource.DirectProgressive,
            -> {
                _state.value = _state.value.copy(playbackStatus = PlaybackStatus.PREPARING, canRetry = false)
                controller?.prepare(generation, source, startPositionMs.coerceAtLeast(0L), playWhenReady = true)
            }
            is PlaybackSource.UnsupportedEmbed -> _state.value = _state.value.copy(
                playbackStatus = PlaybackStatus.UNSUPPORTED,
                error = PlayerError.UnsupportedFormat("Episode is available only through an embedded web player"),
                canRetry = false,
            )
            PlaybackSource.Missing -> fail(PlayerError.MissingSource("Episode has no playback source"))
            is PlaybackSource.Invalid -> fail(PlayerError.InvalidSource(source.reason))
        }
    }

    private fun startProgressPolling() {
        if (progressJob?.isActive == true) return
        progressJob?.cancel()
        lastPeriodicProgressAt = now()
        progressJob = viewModelScope.launch {
            while (isActive) {
                delay(ProgressPollIntervalMs)
                refreshProgress()
                val currentTime = now()
                if (_state.value.isPlaying && currentTime - lastPeriodicProgressAt >= PeriodicProgressIntervalMs) {
                    lastPeriodicProgressAt = currentTime
                    emitProgress(PlaybackProgressReason.PERIODIC)
                }
            }
        }
    }

    private fun stopProgressPolling() {
        progressJob?.cancel()
        progressJob = null
    }

    private fun refreshProgress() {
        val activeController = controller ?: return
        _state.value = _state.value.copy(
            isPlaying = activeController.isPlaying,
            positionMs = activeController.currentPositionMs.coerceAtLeast(0L),
            durationMs = activeController.durationMs.coerceAtLeast(0L),
            bufferedPositionMs = activeController.bufferedPositionMs.coerceAtLeast(0L),
        )
    }

    private fun currentPosition(): Long = controller?.currentPositionMs?.coerceAtLeast(0L) ?: _state.value.positionMs

    private fun emitProgress(reason: PlaybackProgressReason) {
        refreshProgress()
        val snapshot = _state.value
        val episodeSlug = snapshot.episodeSlug ?: return
        if (snapshot.movieSlug.isBlank()) return
        _progressEvents.tryEmit(
            PlaybackProgressEvent(
                movieSlug = snapshot.movieSlug,
                episodeSlug = episodeSlug,
                positionMs = snapshot.positionMs,
                durationMs = snapshot.durationMs,
                updatedAt = now(),
                reason = reason,
            ),
        )
    }

    private fun currentServer(): Server? = _state.value.serverIndex?.let { detail?.servers?.getOrNull(it) }

    private fun fail(error: PlayerError) {
        stopProgressPolling()
        controller?.stop()
        _state.value = _state.value.copy(
            playbackStatus = PlaybackStatus.ERROR,
            isPlaying = false,
            error = error,
            canRetry = false,
        )
    }

    private fun mapDataError(error: DataError): PlayerError = when (error) {
        is DataError.Network -> PlayerError.Network(error.cause)
        is DataError.Timeout -> PlayerError.Timeout
        is DataError.Http -> PlayerError.Http(error.statusCode)
        is DataError.NotFound -> PlayerError.MissingSource("Movie detail was not found")
        is DataError.EmptyResponse -> PlayerError.MissingSource("Movie detail response was empty")
        is DataError.InvalidResponse -> PlayerError.InvalidSource(error.reason)
        is DataError.InvalidRequest -> PlayerError.InvalidSource(error.reason)
    }

    private data class ResolvedServer(val index: Int, val server: Server)

    companion object {
        const val SeekIncrementMs = 10_000L
        const val ProgressPollIntervalMs = 750L
        const val PeriodicProgressIntervalMs = 5_000L
    }
}
