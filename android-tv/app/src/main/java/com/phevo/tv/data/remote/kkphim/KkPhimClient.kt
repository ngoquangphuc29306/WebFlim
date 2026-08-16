package com.phevo.tv.data.remote.kkphim

import com.phevo.tv.data.remote.kkphim.dto.KkPhimDetailResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimJsonAdapters
import com.phevo.tv.data.remote.kkphim.dto.KkPhimListResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimTaxonomyResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimYearResponseDto
import com.phevo.tv.domain.model.DataError
import com.squareup.moshi.JsonDataException
import com.squareup.moshi.JsonEncodingException
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.EOFException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.concurrent.TimeUnit

class KkPhimClient private constructor(
    private val api: KkPhimApi,
    private val baseUrl: String,
    private val maxAttempts: Int,
    private val retryDelayMs: Long,
) {
    suspend fun latest(page: Int): RequestResult<KkPhimListResponseDto> = request(
        "$baseUrl/v1/api/danh-sach?page=${page.safePage()}",
    ) { api.latest(page.safePage()) }

    suspend fun listByType(type: String, page: Int): RequestResult<KkPhimListResponseDto> = request(
        "$baseUrl/v1/api/danh-sach/${type.urlEncode()}?page=${page.safePage()}",
    ) { api.listByType(type, page.safePage()) }

    suspend fun byGenre(
        slug: String,
        page: Int,
        country: String? = null,
        year: Int? = null,
    ): RequestResult<KkPhimListResponseDto> = request(
        buildUrl("$baseUrl/v1/api/the-loai/${slug.urlEncode()}", mapOf("page" to page.safePage(), "country" to country, "year" to year)),
    ) { api.byGenre(slug, page.safePage(), country, year) }

    suspend fun byCountry(
        slug: String,
        page: Int,
        year: Int? = null,
    ): RequestResult<KkPhimListResponseDto> = request(
        buildUrl("$baseUrl/v1/api/quoc-gia/${slug.urlEncode()}", mapOf("page" to page.safePage(), "year" to year)),
    ) { api.byCountry(slug, page.safePage(), year) }

    suspend fun byYear(year: Int, page: Int): RequestResult<KkPhimListResponseDto> = request(
        "$baseUrl/v1/api/nam/$year?page=${page.safePage()}",
    ) { api.byYear(year, page.safePage()) }

    suspend fun search(keyword: String, page: Int): RequestResult<KkPhimListResponseDto> = request(
        buildUrl("$baseUrl/v1/api/tim-kiem", mapOf("keyword" to keyword, "page" to page.safePage(), "limit" to KkPhimConfig.DEFAULT_PAGE_SIZE)),
    ) { api.search(keyword, page.safePage(), KkPhimConfig.DEFAULT_PAGE_SIZE) }

    suspend fun genres(): RequestResult<KkPhimTaxonomyResponseDto> = request("$baseUrl/the-loai") { api.genres() }

    suspend fun countries(): RequestResult<KkPhimTaxonomyResponseDto> = request("$baseUrl/quoc-gia") { api.countries() }

    suspend fun years(): RequestResult<KkPhimYearResponseDto> = request("$baseUrl/nam-phat-hanh") { api.years() }

    suspend fun detail(slug: String): RequestResult<KkPhimDetailResponseDto> = request(
        "$baseUrl/v1/api/phim/${slug.urlEncode()}",
    ) { api.detail(slug) }

    private suspend fun <T> request(
        url: String,
        call: suspend () -> Response<T>,
    ): RequestResult<T> {
        var lastFailure: RequestResult.Failure? = null
        repeat(maxAttempts.coerceAtLeast(1)) { attemptIndex ->
            try {
                val response = call()
                if (!response.isSuccessful) {
                    val failure = if (response.code() == 404) {
                        RequestResult.Failure(DataError.NotFound(url))
                    } else {
                        RequestResult.Failure(DataError.Http(response.code(), url))
                    }
                    lastFailure = failure
                    if (!isRetryableStatus(response.code()) || attemptIndex == maxAttempts - 1) return failure
                } else {
                    val contentType = response.raw().header("Content-Type").orEmpty()
                    if (!contentType.lowercase().contains("application/json")) {
                        return RequestResult.Failure(
                            DataError.InvalidResponse(url, "Expected application/json but received $contentType"),
                        )
                    }
                    val body = response.body() ?: return RequestResult.Failure(DataError.EmptyResponse(url))
                    return RequestResult.Success(body)
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (malformed: JsonDataException) {
                return RequestResult.Failure(DataError.InvalidResponse(url, "Malformed JSON", malformed.message))
            } catch (malformed: JsonEncodingException) {
                return RequestResult.Failure(DataError.InvalidResponse(url, "Invalid JSON encoding", malformed.message))
            } catch (malformed: EOFException) {
                return RequestResult.Failure(DataError.InvalidResponse(url, "Malformed JSON", malformed.message))
            } catch (timeout: SocketTimeoutException) {
                lastFailure = RequestResult.Failure(DataError.Timeout(url))
                if (attemptIndex == maxAttempts - 1) return lastFailure!!
            } catch (io: IOException) {
                lastFailure = if (io.message.orEmpty().contains("timeout", ignoreCase = true)) {
                    RequestResult.Failure(DataError.Timeout(url))
                } else {
                    RequestResult.Failure(DataError.Network(url, io.message))
                }
                if (attemptIndex == maxAttempts - 1) return lastFailure!!
            } catch (unexpected: Exception) {
                return RequestResult.Failure(DataError.InvalidResponse(url, "Unexpected response failure", unexpected.message))
            }
            if (attemptIndex < maxAttempts - 1) delay(retryDelayMs)
        }
        return lastFailure ?: RequestResult.Failure(DataError.Network(url))
    }

    private fun isRetryableStatus(statusCode: Int): Boolean = statusCode == 500 ||
        statusCode == 502 || statusCode == 503 || statusCode == 504

    sealed interface RequestResult<out T> {
        data class Success<T>(val value: T) : RequestResult<T>
        data class Failure(val error: DataError) : RequestResult<Nothing>
    }

    companion object {
        fun create(
            baseUrl: String = KkPhimConfig.BASE_URL,
            timeoutMs: Long = KkPhimConfig.DEFAULT_TIMEOUT_MS,
            maxAttempts: Int = KkPhimConfig.MAX_ATTEMPTS,
            retryDelayMs: Long = KkPhimConfig.RETRY_DELAY_MS,
        ): KkPhimClient {
            val moshi = Moshi.Builder()
                .add(KkPhimJsonAdapters())
                .add(KotlinJsonAdapterFactory())
                .build()
            val httpClient = OkHttpClient.Builder()
                .connectTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                .readTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                .writeTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                .callTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                .build()
            val retrofit = Retrofit.Builder()
                .baseUrl(baseUrl.ensureTrailingSlash())
                .client(httpClient)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()
            return KkPhimClient(
                api = retrofit.create(KkPhimApi::class.java),
                baseUrl = baseUrl.removeSuffix("/"),
                maxAttempts = maxAttempts,
                retryDelayMs = retryDelayMs,
            )
        }

        private fun String.ensureTrailingSlash(): String = if (endsWith('/')) this else "$this/"

        private fun String.urlEncode(): String = URLEncoder.encode(this, StandardCharsets.UTF_8.name())

        private fun buildUrl(base: String, values: Map<String, Any?>): String = values.entries
            .filter { it.value != null && it.value.toString().isNotEmpty() }
            .joinToString("&", prefix = "$base?") { (key, value) ->
                "$key=${URLEncoder.encode(value.toString(), StandardCharsets.UTF_8.name())}"
            }

        private fun Int.safePage(): Int = coerceAtLeast(1)
    }
}
