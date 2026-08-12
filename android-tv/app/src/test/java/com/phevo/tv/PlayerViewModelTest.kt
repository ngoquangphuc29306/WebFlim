package com.phevo.tv

import androidx.media3.ui.PlayerView
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.MoviePage
import com.phevo.tv.domain.model.MovieType
import com.phevo.tv.domain.model.PlaybackProgressEvent
import com.phevo.tv.domain.model.PlaybackProgressReason
import com.phevo.tv.domain.model.PlaybackBackend
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.domain.model.PlaybackStatus
import com.phevo.tv.domain.model.PlayerError
import com.phevo.tv.domain.model.PlayerSelection
import com.phevo.tv.domain.model.Server
import com.phevo.tv.domain.model.TaxonomyItem
import com.phevo.tv.domain.model.YearOption
import com.phevo.tv.domain.repository.CatalogRequest
import com.phevo.tv.domain.repository.MovieRepository
import com.phevo.tv.ui.player.EnginePlaybackStatus
import com.phevo.tv.ui.player.PlaybackController
import com.phevo.tv.ui.player.PlaybackControllerFactory
import com.phevo.tv.ui.player.PlayerViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PlayerViewModelTest {
    private val dispatcher = UnconfinedTestDispatcher()
    private val createdViewModels = mutableListOf<PlayerViewModel>()

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() {
        createdViewModels.forEach(PlayerViewModel::closeSession)
        Dispatchers.resetMain()
    }

    @Test
    fun selectedIdentityResolvesToDirectSourceAndAutoplays() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)

        viewModel.start(PlayerSelection("movie", "episode-2", 0, "Server A"), initialPositionMs = 4_000L)
        runCurrent()

        val request = controller.prepares.single()
        assertEquals("episode-2", viewModel.state.value.episodeSlug)
        assertTrue(request.source is PlaybackSource.DirectHls)
        assertEquals(4_000L, request.startPositionMs)
        assertTrue(request.playWhenReady)
        assertEquals(PlaybackStatus.PREPARING, viewModel.state.value.playbackStatus)
    }

    @Test
    fun mediaCallbacksMapPreparingBufferingReadyAndEnded() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)
        viewModel.start(selection())
        runCurrent()
        val generation = viewModel.state.value.sourceGeneration

        controller.emitStatus(generation, EnginePlaybackStatus.BUFFERING)
        assertEquals(PlaybackStatus.BUFFERING, viewModel.state.value.playbackStatus)
        controller.emitStatus(generation, EnginePlaybackStatus.READY)
        assertEquals(PlaybackStatus.READY, viewModel.state.value.playbackStatus)
        controller.emitStatus(generation, EnginePlaybackStatus.ENDED)
        assertEquals(PlaybackStatus.ENDED, viewModel.state.value.playbackStatus)
    }

    @Test
    fun playPauseCommandsUseControllerAndUpdateFromActualCallback() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)
        viewModel.start(selection())
        runCurrent()

        viewModel.play()
        assertEquals(1, controller.playCalls)
        assertTrue(viewModel.state.value.isPlaying)

        viewModel.pause()
        assertEquals(1, controller.pauseCalls)
        assertFalse(viewModel.state.value.isPlaying)
    }

    @Test
    fun seekClampsToZeroDurationAndKnownDuration() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)
        viewModel.start(selection())
        runCurrent()

        viewModel.seekTo(-10L)
        assertEquals(0L, controller.seekPositions.last())

        controller.duration = 30_000L
        controller.position = 15_000L
        controller.emitStatus(viewModel.state.value.sourceGeneration, EnginePlaybackStatus.READY)
        viewModel.seekTo(90_000L)
        assertEquals(30_000L, controller.seekPositions.last())
    }

    @Test
    fun previousAndNextUseProviderEpisodeOrder() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)
        viewModel.start(PlayerSelection("movie", "episode-2", 0, "Server A"))
        runCurrent()

        assertTrue(viewModel.state.value.hasPreviousEpisode)
        assertTrue(viewModel.state.value.hasNextEpisode)
        viewModel.playPreviousEpisode()
        assertEquals("episode-1", viewModel.state.value.episodeSlug)
        assertFalse(viewModel.state.value.hasPreviousEpisode)
        viewModel.playNextEpisode()
        assertEquals("episode-2", viewModel.state.value.episodeSlug)
    }

    @Test
    fun serverSwitchKeepsSameEpisodeAndPosition() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)
        viewModel.start(PlayerSelection("movie", "episode-1", 0, "Server A"))
        runCurrent()
        controller.position = 72_000L

        viewModel.switchServer(1)

        assertEquals("Server B", viewModel.state.value.serverName)
        assertEquals("episode-1", viewModel.state.value.episodeSlug)
        assertEquals(72_000L, controller.prepares.last().startPositionMs)
    }

    @Test
    fun serverSwitchUsesExistingDetailFallbackWhenEpisodeIsMissing() = runTest {
        val controller = FakePlaybackController(position = 72_000L)
        val detail = detail().copy(
            servers = detail().servers + Server(
                "Server C",
                listOf(Episode("special-1", "Special", m3u8Url = "https://media.example/special.m3u8")),
            ),
        )
        val viewModel = playerViewModel(controller, detail)
        viewModel.start(PlayerSelection("movie", "episode-2", 0, "Server A"))
        runCurrent()

        viewModel.switchServer(2)

        assertEquals("special-1", viewModel.state.value.episodeSlug)
        assertEquals(0L, controller.prepares.last().startPositionMs)
    }

    @Test
    fun serverSwitchToEmbedOnlyMatchingEpisodeShowsEmbeddedWebAndReleasesNativeController() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)
        viewModel.start(PlayerSelection("movie", "episode-2", 0, "Server A"))
        runCurrent()

        viewModel.switchServer(1)

        assertEquals("episode-2", viewModel.state.value.episodeSlug)
        assertEquals("Server B", viewModel.state.value.serverName)
        assertEquals(PlaybackBackend.EmbeddedWeb, viewModel.state.value.backend)
        assertEquals(PlaybackStatus.READY, viewModel.state.value.playbackStatus)
        assertFalse(viewModel.state.value.canRetry)
        assertEquals(1, controller.releaseCalls)
    }

    @Test
    fun embedOnlyEpisodeUsesEmbeddedWebWithoutNativePrepareOrRetry() = runTest {
        val controller = FakePlaybackController()
        val embedDetail = detail().copy(
            servers = listOf(
                Server("Embed", listOf(Episode("episode-1", "Tập 1", embedUrl = "https://embed.example/player/1"))),
            ),
        )
        val viewModel = playerViewModel(controller, embedDetail)

        viewModel.start(PlayerSelection("movie", "episode-1", 0, "Embed"))
        runCurrent()
        viewModel.retryCurrentSource()

        assertEquals(PlaybackBackend.EmbeddedWeb, viewModel.state.value.backend)
        assertEquals(PlaybackStatus.READY, viewModel.state.value.playbackStatus)
        assertFalse(viewModel.state.value.canRetry)
        assertTrue(controller.prepares.isEmpty())
    }

    @Test
    fun embedToDirectServerSwitchCreatesNativeControllerOnlyForTheDirectSource() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)

        viewModel.start(PlayerSelection("movie", "episode-2", 1, "Server B"))
        runCurrent()
        assertEquals(PlaybackBackend.EmbeddedWeb, viewModel.state.value.backend)
        assertTrue(controller.prepares.isEmpty())

        viewModel.switchServer(0)

        assertEquals(PlaybackBackend.NativeMedia3, viewModel.state.value.backend)
        assertEquals("Server A", viewModel.state.value.serverName)
        assertEquals(1, controller.prepares.size)
        assertTrue(controller.prepares.single().source is PlaybackSource.DirectHls)
    }

    @Test
    fun staleEpisodeAndServerCallbacksCannotReplaceCurrentState() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)
        viewModel.start(selection())
        runCurrent()
        val generationA = viewModel.state.value.sourceGeneration

        viewModel.switchEpisode("episode-2")
        val generationB = viewModel.state.value.sourceGeneration
        controller.emitFirstFrame(generationA)
        controller.emitStatus(generationA, EnginePlaybackStatus.ENDED)
        controller.emitError(generationA, PlayerError.Network())

        assertEquals(generationB, viewModel.state.value.sourceGeneration)
        assertEquals("episode-2", viewModel.state.value.episodeSlug)
        assertEquals(PlaybackStatus.PREPARING, viewModel.state.value.playbackStatus)
        assertFalse(viewModel.state.value.hasRenderedFirstFrame)

        controller.emitFirstFrame(generationB)
        assertTrue(viewModel.state.value.hasRenderedFirstFrame)
    }

    @Test
    fun explicitRetryPreservesIdentityAndCurrentPositionWithoutLooping() = runTest {
        val controller = FakePlaybackController()
        val viewModel = playerViewModel(controller)
        viewModel.start(selection())
        runCurrent()
        controller.position = 11_000L
        val firstGeneration = viewModel.state.value.sourceGeneration
        controller.emitError(firstGeneration, PlayerError.Network())

        viewModel.retryCurrentSource()

        assertEquals(2, controller.prepares.size)
        assertEquals("episode-1", viewModel.state.value.episodeSlug)
        assertEquals(11_000L, controller.prepares.last().startPositionMs)
        assertEquals(PlaybackStatus.PREPARING, viewModel.state.value.playbackStatus)
    }

    @Test
    fun progressEventsUseMovieAndEpisodeIdentityForPeriodicPauseSwitchEndedAndExit() = runTest {
        var clock = 0L
        val controller = FakePlaybackController(position = 6_000L, duration = 60_000L)
        val events = mutableListOf<PlaybackProgressEvent>()
        val viewModel = playerViewModel(controller, now = { clock })
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            viewModel.progressEvents.collect { events += it }
        }
        viewModel.start(selection())
        runCurrent()
        controller.play()
        clock = 5_000L
        advanceTimeBy(PlayerViewModel.ProgressPollIntervalMs + 1L)
        viewModel.pause()
        viewModel.switchEpisode("episode-2")
        controller.emitStatus(viewModel.state.value.sourceGeneration, EnginePlaybackStatus.ENDED)
        viewModel.closeSession()

        assertTrue(events.map { it.reason }.containsAll(
            listOf(
                PlaybackProgressReason.PERIODIC,
                PlaybackProgressReason.PAUSE,
                PlaybackProgressReason.SOURCE_SWITCH,
                PlaybackProgressReason.ENDED,
                PlaybackProgressReason.EXIT,
            ),
        ))
        assertTrue(events.all { it.movieSlug == "movie" })
        assertTrue(events.all { it.episodeSlug == "episode-1" || it.episodeSlug == "episode-2" })
    }

    @Test
    fun backgroundPausesAndCloseReleasesExactlyOnceAndStopsPolling() = runTest {
        val controller = FakePlaybackController()
        val factory = FakeControllerFactory(controller)
        val viewModel = PlayerViewModel(TestPlayerRepository(detail()), factory).also(createdViewModels::add)
        viewModel.start(selection())
        runCurrent()
        controller.play()

        viewModel.onBackground()
        assertEquals(1, controller.pauseCalls)
        viewModel.closeSession()
        viewModel.closeSession()
        advanceUntilIdle()

        assertEquals(1, controller.releaseCalls)
        assertFalse(viewModel.state.value.isPlaying)
    }

    private fun playerViewModel(
        controller: FakePlaybackController,
        movieDetail: MovieDetail = detail(),
        now: () -> Long = { 1_000L },
    ) = PlayerViewModel(TestPlayerRepository(movieDetail), FakeControllerFactory(controller), now)
        .also(createdViewModels::add)

    private fun selection() = PlayerSelection("movie", "episode-1", 0, "Server A")

    private fun detail(): MovieDetail = MovieDetail(
        movie = Movie("movie", "Movie", type = MovieType.SERIES),
        synopsis = "Synopsis",
        servers = listOf(
            Server(
                "Server A",
                listOf(
                    Episode("episode-1", "Tập 1", m3u8Url = "https://media.example/episode-1.m3u8"),
                    Episode("episode-2", "Tập 2", m3u8Url = "https://media.example/episode-2.m3u8"),
                    Episode("episode-3", "Tập 3", m3u8Url = "https://media.example/episode-3.m3u8"),
                ),
            ),
            Server(
                "Server B",
                listOf(
                    Episode("episode-1", "Tập 1", m3u8Url = "https://backup.example/episode-1.m3u8"),
                    Episode("episode-2", "Tập 2", embedUrl = "https://backup.example/embed/2"),
                ),
            ),
        ),
    )
}

private data class PrepareCall(
    val generation: Long,
    val source: PlaybackSource,
    val startPositionMs: Long,
    val playWhenReady: Boolean,
)

private class FakePlaybackController(
    var position: Long = 0L,
    var duration: Long = 0L,
    var buffered: Long = 0L,
) : PlaybackController {
    private var listener: PlaybackController.Listener? = null
    private var activeGeneration = 0L
    var playing = false
    val prepares = mutableListOf<PrepareCall>()
    val seekPositions = mutableListOf<Long>()
    var playCalls = 0
    var pauseCalls = 0
    var stopCalls = 0
    var releaseCalls = 0

    override val currentPositionMs: Long get() = position
    override val durationMs: Long get() = duration
    override val bufferedPositionMs: Long get() = buffered
    override val isPlaying: Boolean get() = playing

    override fun setListener(listener: PlaybackController.Listener?) {
        this.listener = listener
    }

    override fun prepare(
        generation: Long,
        source: PlaybackSource,
        startPositionMs: Long,
        playWhenReady: Boolean,
    ) {
        activeGeneration = generation
        position = startPositionMs
        playing = false
        prepares += PrepareCall(generation, source, startPositionMs, playWhenReady)
    }

    override fun play() {
        playCalls++
        playing = true
        listener?.onIsPlayingChanged(activeGeneration, true)
    }

    override fun pause() {
        pauseCalls++
        playing = false
        listener?.onIsPlayingChanged(activeGeneration, false)
    }

    override fun seekTo(positionMs: Long) {
        position = positionMs
        seekPositions += positionMs
    }

    override fun stop() {
        stopCalls++
        playing = false
    }

    override fun attach(playerView: PlayerView) = Unit
    override fun detach(playerView: PlayerView) = Unit

    override fun release() {
        releaseCalls++
        playing = false
    }

    fun emitStatus(generation: Long, status: EnginePlaybackStatus) {
        listener?.onPlaybackStatus(generation, status)
    }

    fun emitError(generation: Long, error: PlayerError) {
        listener?.onPlaybackError(generation, error)
    }

    fun emitFirstFrame(generation: Long) {
        listener?.onFirstFrameRendered(generation)
    }
}

private class FakeControllerFactory(
    private val controller: FakePlaybackController,
) : PlaybackControllerFactory {
    override fun create(): PlaybackController = controller
}

private class TestPlayerRepository(
    private val detail: MovieDetail,
) : MovieRepository {
    override suspend fun getMovieDetail(slug: String): DataResult<MovieDetail> = DataResult.Success(detail)
    override suspend fun getLatestMovies(page: Int): DataResult<MoviePage> = unsupported()
    override suspend fun getMovieListBySlug(slug: String, page: Int): DataResult<MoviePage> = unsupported()
    override suspend fun getMoviesByGenre(slug: String, page: Int): DataResult<MoviePage> = unsupported()
    override suspend fun getMoviesByCountry(slug: String, page: Int): DataResult<MoviePage> = unsupported()
    override suspend fun getMoviesByYear(year: Int, page: Int): DataResult<MoviePage> = unsupported()
    override suspend fun searchMovies(keyword: String, page: Int): DataResult<MoviePage> = unsupported()
    override suspend fun getGenresList(): DataResult<List<TaxonomyItem>> = unsupported()
    override suspend fun getCountriesList(): DataResult<List<TaxonomyItem>> = unsupported()
    override suspend fun getYearsList(): DataResult<List<YearOption>> = unsupported()
    override suspend fun getCatalogMovies(request: CatalogRequest): DataResult<MoviePage> = unsupported()

    private fun <T> unsupported(): DataResult<T> = error("Not used by player tests")
}
