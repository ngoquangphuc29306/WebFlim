package com.phevo.tv.data.remote.auth

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.CancellationException
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class RetrofitAuthRemoteDataSource private constructor(
    private val deviceLinkApi: DeviceLinkApi,
    private val authApi: SupabaseAuthApi,
    private val config: AuthConfig = AuthConfig,
) : AuthRemoteDataSource {
    override suspend fun createDeviceLink(): RemoteResult<CreatedDeviceLink> {
        if (!config.isConfigured) return RemoteResult.Failure(RemoteError.Configuration)
        return when (val result = remoteCall {
            deviceLinkApi.request(DeviceLinkRequestDto(action = "create"))
        }) {
            is RemoteResult.Failure -> result
            is RemoteResult.Success -> result.value.toCreatedLink()
        }
    }

    override suspend fun getDeviceLinkStatus(
        sessionId: String,
        deviceCode: String,
    ): RemoteResult<DeviceLinkStatusResult> = when (val result = remoteCall {
        deviceLinkApi.request(
            DeviceLinkRequestDto(
                action = "status",
                sessionId = sessionId,
                deviceCode = deviceCode,
            ),
        )
    }) {
        is RemoteResult.Failure -> result
        is RemoteResult.Success -> result.value.toStatus()
    }

    override suspend fun exchangeDeviceLink(
        sessionId: String,
        deviceCode: String,
    ): RemoteResult<RemoteAuthTokens> = when (val result = remoteCall {
        deviceLinkApi.request(
            DeviceLinkRequestDto(
                action = "exchange",
                sessionId = sessionId,
                deviceCode = deviceCode,
            ),
        )
    }) {
        is RemoteResult.Failure -> result
        is RemoteResult.Success -> result.value.toTokens()
    }

    override suspend fun refreshSession(refreshToken: String): RemoteResult<RemoteAuthTokens> = when (val result = remoteCall {
        authApi.refresh(refreshToken = refreshToken)
    }) {
        is RemoteResult.Failure -> result
        is RemoteResult.Success -> result.value.toTokens()
    }

    private fun DeviceLinkResponseDto.toCreatedLink(): RemoteResult<CreatedDeviceLink> {
        val sessionId = sessionId?.trim().orEmpty()
        val deviceCode = deviceCode?.trim().orEmpty()
        val userCode = userCode?.trim().orEmpty()
        val verificationUrl = verificationUrl?.trim().orEmpty()
        val expiresAt = expiresAt.toEpochMs()
        return if (sessionId.isBlank() || deviceCode.isBlank() || userCode.isBlank() || verificationUrl.isBlank() || expiresAt <= 0L) {
            RemoteResult.Failure(RemoteError.InvalidResponse)
        } else {
            RemoteResult.Success(CreatedDeviceLink(sessionId, deviceCode, userCode, verificationUrl, expiresAt))
        }
    }

    private fun DeviceLinkResponseDto.toStatus(): RemoteResult<DeviceLinkStatusResult> {
        val normalized = status?.uppercase()?.let { value ->
            runCatching { DeviceLinkStatus.valueOf(value) }.getOrNull()
        } ?: return RemoteResult.Failure(RemoteError.InvalidResponse)
        return RemoteResult.Success(DeviceLinkStatusResult(normalized, userId?.trim()?.takeIf { it.isNotEmpty() }))
    }

    private fun DeviceLinkResponseDto.toTokens(): RemoteResult<RemoteAuthTokens> {
        val userId = userId?.trim().orEmpty()
        val accessToken = accessToken?.trim().orEmpty()
        val refreshToken = refreshToken?.trim().orEmpty()
        val expiresAt = expiresAt.toEpochMs().takeIf { it > 0L }
            ?: expiresIn?.let { System.currentTimeMillis() + it * 1_000L }
            ?: 0L
        return if (userId.isBlank() || accessToken.isBlank() || refreshToken.isBlank() || expiresAt <= 0L) {
            RemoteResult.Failure(RemoteError.InvalidResponse)
        } else {
            RemoteResult.Success(RemoteAuthTokens(userId, accessToken, refreshToken, expiresAt))
        }
    }

    private fun SupabaseTokenResponseDto.toTokens(): RemoteResult<RemoteAuthTokens> {
        val userId = user?.id?.trim().orEmpty()
        val accessToken = accessToken?.trim().orEmpty()
        val refreshToken = refreshToken?.trim().orEmpty()
        val expiresAt = expiresIn?.let { System.currentTimeMillis() + it * 1_000L } ?: 0L
        return if (userId.isBlank() || accessToken.isBlank() || refreshToken.isBlank() || expiresAt <= 0L) {
            RemoteResult.Failure(RemoteError.InvalidResponse)
        } else {
            RemoteResult.Success(RemoteAuthTokens(userId, accessToken, refreshToken, expiresAt))
        }
    }

    companion object {
        fun create(config: AuthConfig = AuthConfig): AuthRemoteDataSource? {
            if (!config.isConfigured) return null
            val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
            val authHeader = Interceptor { chain ->
                chain.proceed(
                    chain.request().newBuilder()
                        .header("apikey", config.supabaseAnonKey)
                        .build(),
                )
            }
            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .callTimeout(10, TimeUnit.SECONDS)
                .addInterceptor(authHeader)
                .build()
            val deviceLinkRetrofit = Retrofit.Builder()
                .baseUrl("${config.deviceLinkFunctionUrl}/")
                .client(client)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()
            val authRetrofit = Retrofit.Builder()
                .baseUrl("${config.supabaseUrl}/")
                .client(client)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()
            return RetrofitAuthRemoteDataSource(
                deviceLinkApi = deviceLinkRetrofit.create(DeviceLinkApi::class.java),
                authApi = authRetrofit.create(SupabaseAuthApi::class.java),
                config = config,
            )
        }
    }
}

private fun String?.toEpochMs(): Long {
    val value = this?.trim().orEmpty()
    value.toLongOrNull()?.let { return it }
    val patterns = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX")
    return patterns.firstNotNullOfOrNull { pattern ->
        runCatching {
            SimpleDateFormat(pattern, Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
                isLenient = false
            }.parse(value)?.time
        }.getOrNull()
    } ?: 0L
}
