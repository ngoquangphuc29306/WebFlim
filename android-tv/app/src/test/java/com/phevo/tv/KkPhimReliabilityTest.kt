package com.phevo.tv

import com.phevo.tv.data.remote.kkphim.KkPhimClient
import com.phevo.tv.data.remote.kkphim.KkPhimConfig
import com.phevo.tv.domain.model.DataError
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
import java.util.concurrent.TimeUnit

class KkPhimReliabilityTest {
    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun successfulResponseUsesOneAttempt() = runBlocking {
        server.enqueue(json("{\"status\":true,\"data\":{\"items\":[]}}"))

        val result = client().latest(2)

        assertTrue(result is KkPhimClient.RequestResult.Success)
        assertEquals(1, server.requestCount)
        assertEquals("/v1/api/danh-sach?page=2", server.takeRequest().path)
    }

    @Test
    fun fiveHundredRetriesOnceAndSucceeds() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(500))
        server.enqueue(json("{\"status\":true,\"data\":{\"items\":[]}}"))

        val result = client().latest(1)

        assertTrue(result is KkPhimClient.RequestResult.Success)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun notFoundDoesNotRetry() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(404))

        val result = client().detail("missing")

        assertEquals(KkPhimClient.RequestResult.Failure(DataError.NotFound("${server.url("/").toString().removeSuffix("/")}/v1/api/phim/missing")), result)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun timeoutRetriesOnce() = runBlocking {
        server.enqueue(json("{\"status\":true,\"data\":{\"items\":[]}}", bodyDelayMs = 150))
        server.enqueue(json("{\"status\":true,\"data\":{\"items\":[]}}"))

        val result = KkPhimClient.create(
            baseUrl = server.url("/").toString(),
            timeoutMs = 40,
            retryDelayMs = 1,
        ).latest(1)

        assertTrue(result is KkPhimClient.RequestResult.Success || result is KkPhimClient.RequestResult.Failure)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun malformedJsonDoesNotRetry() = runBlocking {
        server.enqueue(json("{"))

        val result = client().latest(1)

        assertTrue(result is KkPhimClient.RequestResult.Failure)
        assertTrue((result as KkPhimClient.RequestResult.Failure).error is DataError.InvalidResponse)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun emptyBodyIsFailureWithoutRetry() = runBlocking {
        server.enqueue(json(""))

        val result = client().latest(1)

        assertTrue(result is KkPhimClient.RequestResult.Failure)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun cancellationIsNotConvertedIntoNetworkError() = runBlocking {
        server.enqueue(json("{\"status\":true,\"data\":{\"items\":[]}}", bodyDelayMs = 5_000))
        val job = launch { client(timeoutMs = 10_000).latest(1) }
        delay(50)
        job.cancel()
        job.join()
        assertTrue(job.isCancelled)
    }

    private fun client(timeoutMs: Long = KkPhimConfig.DEFAULT_TIMEOUT_MS): KkPhimClient = KkPhimClient.create(
        baseUrl = server.url("/").toString(),
        timeoutMs = timeoutMs,
        retryDelayMs = 1,
    )

    private fun json(body: String, bodyDelayMs: Long = 0): MockResponse = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody(body)
        .apply { if (bodyDelayMs > 0) setBodyDelay(bodyDelayMs, TimeUnit.MILLISECONDS) }
}
