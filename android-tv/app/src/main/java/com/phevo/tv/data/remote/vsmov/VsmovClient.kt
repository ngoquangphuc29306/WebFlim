package com.phevo.tv.data.remote.vsmov

import com.squareup.moshi.JsonDataException
import com.squareup.moshi.JsonEncodingException
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.phevo.tv.data.remote.vsmov.dto.VsmovDetailResponseDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovJsonAdapters
import com.phevo.tv.data.remote.vsmov.dto.VsmovListResponseDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovTaxonomyResponseDto
import com.phevo.tv.domain.model.DataError
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.IOException
import java.io.EOFException
import java.net.SocketTimeoutException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.concurrent.TimeUnit

class VsmovClient private constructor(
    private val vsmovApi: VsmovApi,
    private val phimApi: PhimApi,
    private val vsmovBaseUrl: String,
    private val phimApiBaseUrl: String,
    private val maxAttempts: Int,
    private val retryDelayMs: Long,
) {
    suspend fun latest(page: Int): RequestResult<VsmovListResponseDto> = request(
        url = "$vsmovBaseUrl/danh-sach/phim-moi-cap-nhat?page=$page",
    ) { vsmovApi.latest(page) }

    suspend fun listBySlug(slug: String, page: Int): RequestResult<VsmovListResponseDto> = request(
        url = "$vsmovBaseUrl/danh-sach/$slug?page=$page",
    ) { vsmovApi.listBySlug(slug, page) }

    suspend fun byGenre(
        slug: String,
        page: Int,
        country: String? = null,
        year: Int? = null,
        type: String? = null,
    ): RequestResult<VsmovListResponseDto> = request(
        url = buildUrl("$vsmovBaseUrl/the-loai/$slug", mapOf("country" to country, "year" to year, "type" to type, "page" to page)),
    ) { vsmovApi.byGenre(slug, page, country, year, type) }

    suspend fun byCountry(
        slug: String,
        page: Int,
        year: Int? = null,
        type: String? = null,
    ): RequestResult<VsmovListResponseDto> = request(
        url = buildUrl("$vsmovBaseUrl/quoc-gia/$slug", mapOf("year" to year, "type" to type, "page" to page)),
    ) { vsmovApi.byCountry(slug, page, year, type) }

    suspend fun byYear(year: Int, page: Int): RequestResult<VsmovListResponseDto> = request(
        url = "$vsmovBaseUrl/nam/$year?page=$page",
    ) { vsmovApi.byYear(year, page) }

    suspend fun search(keyword: String, page: Int): RequestResult<VsmovListResponseDto> = request(
        url = buildUrl("$vsmovBaseUrl/tim-kiem", mapOf("keyword" to keyword, "page" to page)),
    ) { vsmovApi.search(keyword, page) }

    suspend fun genres(): RequestResult<VsmovTaxonomyResponseDto> = request(
        url = "$vsmovBaseUrl/the-loai",
    ) { vsmovApi.genres() }

    suspend fun countries(): RequestResult<VsmovTaxonomyResponseDto> = request(
        url = "$vsmovBaseUrl/quoc-gia",
    ) { vsmovApi.countries() }

    suspend fun years(): RequestResult<VsmovTaxonomyResponseDto> = request(
        url = "$vsmovBaseUrl/nam",
    ) { vsmovApi.years() }

    suspend fun detail(slug: String): RequestResult<VsmovDetailResponseDto> = request(
        url = "$vsmovBaseUrl/phim/$slug",
    ) { vsmovApi.detail(slug) }

    suspend fun fallbackDetail(slug: String): RequestResult<VsmovDetailResponseDto> = request(
        url = "$phimApiBaseUrl/phim/$slug",
    ) { phimApi.detail(slug) }

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
                    val body = response.body()
                    if (body == null) return RequestResult.Failure(DataError.EmptyResponse(url))
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
            } catch (timeout: IOException) {
                val failure = if (timeout.message.orEmpty().contains("timeout", ignoreCase = true)) {
                    RequestResult.Failure(DataError.Timeout(url))
                } else {
                    RequestResult.Failure(DataError.Network(url, timeout.message))
                }
                lastFailure = failure
                if (attemptIndex == maxAttempts - 1) return failure
            } catch (unexpected: Exception) {
                return RequestResult.Failure(DataError.InvalidResponse(url, "Unexpected response failure", unexpected.message))
            }
            if (attemptIndex < maxAttempts - 1) delay(retryDelayMs)
        }
        return lastFailure ?: RequestResult.Failure(DataError.Network(url))
    }

    private fun isRetryableStatus(statusCode: Int): Boolean = statusCode == 500 ||
        statusCode == 502 || statusCode == 503 || statusCode == 504

    private fun buildUrl(base: String, values: Map<String, Any?>): String = values.entries
        .filter { it.value != null }
        .joinToString("&", prefix = "$base?") { (key, value) ->
            val encoded = URLEncoder.encode(value.toString(), StandardCharsets.UTF_8.name())
            "$key=$encoded"
        }

    sealed interface RequestResult<out T> {
        data class Success<T>(val value: T) : RequestResult<T>
        data class Failure(val error: DataError) : RequestResult<Nothing>
    }

    companion object {
        fun create(
            vsmovBaseUrl: String = VsmovConfig.VSMOV_BASE_URL,
            phimApiBaseUrl: String = VsmovConfig.PHIM_API_BASE_URL,
            timeoutMs: Long = VsmovConfig.DEFAULT_TIMEOUT_MS,
            maxAttempts: Int = VsmovConfig.MAX_ATTEMPTS,
            retryDelayMs: Long = VsmovConfig.RETRY_DELAY_MS,
        ): VsmovClient {
            val moshi = Moshi.Builder()
                .add(VsmovJsonAdapters())
                .add(KotlinJsonAdapterFactory())
                .build()
            val httpClient = OkHttpClient.Builder()
                .connectTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                .readTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                .writeTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                .callTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                .build()
            fun retrofit(baseUrl: String) = Retrofit.Builder()
                .baseUrl(baseUrl.ensureTrailingSlash())
                .client(httpClient)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()
            return VsmovClient(
                vsmovApi = retrofit(vsmovBaseUrl).create(VsmovApi::class.java),
                phimApi = retrofit(phimApiBaseUrl).create(PhimApi::class.java),
                vsmovBaseUrl = vsmovBaseUrl.removeSuffix("/"),
                phimApiBaseUrl = phimApiBaseUrl.removeSuffix("/"),
                maxAttempts = maxAttempts,
                retryDelayMs = retryDelayMs,
            )
        }

        private fun String.ensureTrailingSlash(): String = if (endsWith('/')) this else "$this/"
    }
}
