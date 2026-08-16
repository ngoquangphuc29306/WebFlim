package com.phevo.tv

import com.phevo.tv.data.remote.kkphim.KkPhimClient
import com.phevo.tv.data.repository.KkPhimMovieRepository
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieType
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.domain.model.Server
import com.phevo.tv.domain.repository.CatalogEndpoint
import com.phevo.tv.domain.repository.CatalogFilters
import com.phevo.tv.domain.repository.CatalogRequest
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import com.phevo.tv.ui.player.PlaybackSourceClassifier

class KkPhimRepositoryTest {
    private lateinit var server: MockWebServer
    private lateinit var repository: KkPhimMovieRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        repository = KkPhimMovieRepository(KkPhimClient.create(baseUrl = server.url("/").toString(), retryDelayMs = 1))
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun repositorySupportsLatestSearchDetailTaxonomyAndCatalog() = runBlocking {
        repeat(4) { server.enqueue(json(resource("list.json"))) }
        server.enqueue(json(resource("detail-multi-server.json")))
        server.enqueue(json(resource("taxonomy.json")))
        server.enqueue(json(resource("taxonomy.json")))
        server.enqueue(json(resource("years.json")))

        assertTrue(repository.getLatestMovies() is DataResult.Success)
        assertTrue(repository.searchMovies("mẫu phim") is DataResult.Success)
        assertTrue(repository.getMoviesByGenre("hanh-dong") is DataResult.Success)
        assertTrue(repository.getMoviesByCountry("au-my") is DataResult.Success)
        assertTrue(repository.getMovieDetail("mau-phim") is DataResult.Success)
        assertEquals(2, (repository.getGenresList() as DataResult.Success).value.size)
        assertEquals(2, (repository.getCountriesList() as DataResult.Success).value.size)
        assertEquals(2, (repository.getYearsList() as DataResult.Success).value.size)

        server.enqueue(json(resource("list.json")))
        val catalog = repository.getCatalogMovies(
            CatalogRequest(CatalogEndpoint.TYPE, "hoathinh", CatalogFilters(page = 2)),
        )
        assertTrue(catalog is DataResult.Success)
        assertEquals(9, server.requestCount)
    }

    @Test
    fun playbackResolutionKeepsSlugThenFallsBackToFirstAndHandlesEmptyServer() {
        val requested = Episode("tap-2", "Tập 2", m3u8Url = "https://old/2.m3u8")
        val target = Server("Lồng Tiếng", listOf(Episode("tap-1", "Tập 1"), requested))
        val missing = Server("Backup", listOf(Episode("tap-1", "Tập 1")))
        val empty = Server("Empty", emptyList())

        assertEquals("tap-2", repository.resolveEpisodeOrNull(target, requested)!!.episodeSlug)
        assertEquals("tap-1", repository.resolveEpisodeOrNull(missing, requested)!!.episodeSlug)
        assertNull(repository.resolveEpisodeOrNull(empty, requested))
    }

    @Test
    fun emptyServerClearsPlaybackSourceAndClassifiesAsMissing() = runBlocking {
        val requested = Episode("tap-2", "Tập 2", m3u8Url = "https://stream.example.test/2.m3u8")
        val resolved = repository.resolvePlaybackEpisode(
            MovieDetail(Movie("mau-phim", "Mẫu Phim", type = MovieType.SERIES), "", emptyList()),
            Server("Empty", emptyList()),
            requested,
        )

        assertNull(resolved.m3u8Url)
        assertNull(resolved.embedUrl)
        assertEquals(PlaybackSource.Missing, PlaybackSourceClassifier.classify(resolved))
    }

    @Test
    fun emptyKeywordReturnsEmptySuccessWithoutNetworkRequest() = runBlocking {
        val result = repository.searchMovies("   ")
        assertTrue(result is DataResult.Success)
        assertEquals(0, (result as DataResult.Success).value.items.size)
        assertEquals(0, server.requestCount)
    }

    private fun json(body: String): MockResponse = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody(body)

    private fun resource(name: String): String = javaClass.getResource("/kkphim/$name")!!.readText()
}
