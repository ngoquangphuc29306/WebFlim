package com.phevo.tv

import com.phevo.tv.data.remote.vsmov.VsmovClient
import com.phevo.tv.data.remote.vsmov.VsmovConfig
import com.phevo.tv.data.repository.VsmovMovieRepository
import com.phevo.tv.domain.model.DataError
import com.phevo.tv.domain.model.DataResult
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class VsmovReliabilityTest {
    private lateinit var server: MockWebServer
    private lateinit var fixtureList: String
    private lateinit var fixtureDetail: String

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        fixtureList = javaClass.getResource("/vsmov/list.json")!!.readText()
        fixtureDetail = javaClass.getResource("/vsmov/detail.json")!!.readText()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun temporary503RetriesOnceThenSucceeds() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(503))
        server.enqueue(json(fixtureList))

        val result = client().latest(1)

        assertTrue(result is VsmovClient.RequestResult.Success)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun allAllowedTransientStatusesRetryOnce() = runBlocking {
        listOf(500, 502, 503, 504).forEach { status ->
            server.enqueue(MockResponse().setResponseCode(status))
            server.enqueue(json(fixtureList))
            assertTrue(client().latest(1) is VsmovClient.RequestResult.Success)
        }

        assertEquals(8, server.requestCount)
    }

    @Test
    fun status501DoesNotRetry() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(501))

        val result = client().latest(1)

        assertEquals(DataError.Http(501, "${baseApi()}/danh-sach/phim-moi-cap-nhat?page=1"), (result as VsmovClient.RequestResult.Failure).error)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun status404DoesNotRetry() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(404))

        val result = client().latest(1)

        assertEquals(DataError.NotFound("${baseApi()}/danh-sach/phim-moi-cap-nhat?page=1"), (result as VsmovClient.RequestResult.Failure).error)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun status505DoesNotRetry() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(505))

        val result = client().latest(1)

        assertEquals(DataError.Http(505, "${baseApi()}/danh-sach/phim-moi-cap-nhat?page=1"), (result as VsmovClient.RequestResult.Failure).error)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun malformedJsonIsInvalidResponseAndNotRetried() = runBlocking {
        server.enqueue(json("{"))

        val result = client().latest(1)

        assertTrue((result as VsmovClient.RequestResult.Failure).error is DataError.InvalidResponse)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun invalidContentTypeIsInvalidResponseAndNotRetried() = runBlocking {
        server.enqueue(MockResponse().setHeader("Content-Type", "text/html").setBody("{}"))

        val result = client().latest(1)

        assertTrue((result as VsmovClient.RequestResult.Failure).error is DataError.InvalidResponse)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun timeoutRetriesOnce() = runBlocking {
        server.enqueue(json(fixtureList).setBodyDelay(150, java.util.concurrent.TimeUnit.MILLISECONDS))
        server.enqueue(json(fixtureList).setBodyDelay(150, java.util.concurrent.TimeUnit.MILLISECONDS))

        val result = client(timeoutMs = 25).latest(1)

        assertEquals(DataError.Timeout("${baseApi()}/danh-sach/phim-moi-cap-nhat?page=1"), (result as VsmovClient.RequestResult.Failure).error)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun networkFailureIsBounded() = runBlocking {
        val deadServer = MockWebServer()
        deadServer.start()
        val base = deadServer.url("/api/").toString()
        deadServer.shutdown()

        val result = VsmovClient.create(
            vsmovBaseUrl = base,
            phimApiBaseUrl = base,
            timeoutMs = 100,
            retryDelayMs = 1,
        ).latest(1)

        assertTrue((result as VsmovClient.RequestResult.Failure).error is DataError.Network || result.error is DataError.Timeout)
    }

    @Test
    fun cancellationIsNotConvertedToDataError() = runBlocking {
        server.enqueue(json(fixtureList).setBodyDelay(500, java.util.concurrent.TimeUnit.MILLISECONDS))
        val job = launch {
            try {
                client(timeoutMs = 1_000).latest(1)
            } catch (_: CancellationException) {
                throw CancellationException("test cancellation")
            }
        }
        delay(30)
        job.cancelAndJoin()
        assertTrue(job.isCancelled)
    }

    @Test
    fun detailSuccessDoesNotCallFallback() = runBlocking {
        server.enqueue(json(fixtureDetail))

        val result = repository().getMovieDetail("phim-kiem-thu")

        assertTrue(result is DataResult.Success)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun missingPrimaryDetailUsesPhimApiFallbackOnce() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(404))
        server.enqueue(json(fixtureDetail))

        val result = repository().getMovieDetail("phim-kiem-thu")

        assertTrue(result is DataResult.Success)
        assertEquals(2, server.requestCount)
        assertEquals("/api/phim/phim-kiem-thu", server.takeRequest(1, java.util.concurrent.TimeUnit.SECONDS)?.path)
        assertEquals("/phim/phim-kiem-thu", server.takeRequest(1, java.util.concurrent.TimeUnit.SECONDS)?.path)
    }

    @Test
    fun aliasFallbackIsFiniteAtSixAttempts() = runBlocking {
        repeat(6) { server.enqueue(MockResponse().setResponseCode(503)) }

        val result = repository().getMovieDetail("one-piece")

        assertTrue(result is DataResult.Failure)
        assertEquals(6, server.requestCount)
    }

    @Test
    fun aliasCandidateCanSucceedWithoutLooping() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(404))
        server.enqueue(MockResponse().setResponseCode(404))
        server.enqueue(json(fixtureDetail))

        val result = repository().getMovieDetail("one-piece")

        assertTrue(result is DataResult.Success)
        assertEquals(3, server.requestCount)
    }

    @Test
    fun suspiciousPrimaryEpisodeUsesFallbackWithoutExtraAliasRequests() = runBlocking {
        server.enqueue(json(fixtureDetail.replace("Tập 10", "Tập 551")))
        server.enqueue(json(fixtureDetail))

        val result = repository().getMovieDetail("phim-kiem-thu")

        assertTrue(result is DataResult.Success)
        assertEquals(2, server.requestCount)
    }

    private fun client(timeoutMs: Long = VsmovConfig.DEFAULT_TIMEOUT_MS): VsmovClient = VsmovClient.create(
        vsmovBaseUrl = server.url("/api/").toString(),
        phimApiBaseUrl = server.url("/").toString(),
        timeoutMs = timeoutMs,
        retryDelayMs = 1,
    )

    private fun repository() = VsmovMovieRepository(client())

    private fun baseApi(): String = server.url("/api/").toString().removeSuffix("/")

    private fun json(body: String): MockResponse = MockResponse()
        .setHeader("Content-Type", "application/json; charset=utf-8")
        .setBody(body)
}
