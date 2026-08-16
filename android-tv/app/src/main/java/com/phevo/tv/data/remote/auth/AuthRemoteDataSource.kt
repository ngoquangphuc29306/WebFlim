package com.phevo.tv.data.remote.auth

import kotlinx.coroutines.CancellationException
import java.io.IOException

data class CreatedDeviceLink(
    val sessionId: String,
    val deviceCode: String,
    val userCode: String,
    val verificationUrl: String,
    val expiresAtEpochMs: Long,
)

enum class DeviceLinkStatus {
    PENDING,
    APPROVED,
    EXPIRED,
    CONSUMED,
}

data class DeviceLinkStatusResult(
    val status: DeviceLinkStatus,
    val userId: String?,
)

data class RemoteAuthTokens(
    val userId: String,
    val accessToken: String,
    val refreshToken: String,
    val expiresAtEpochMs: Long,
)

sealed interface RemoteError {
    data object Offline : RemoteError
    data object Timeout : RemoteError
    data class Http(val code: Int) : RemoteError
    data object InvalidResponse : RemoteError
    data object Configuration : RemoteError
    data class Unexpected(val message: String) : RemoteError
}

sealed interface RemoteResult<out T> {
    data class Success<T>(val value: T) : RemoteResult<T>
    data class Failure(val error: RemoteError) : RemoteResult<Nothing>
}

interface AuthRemoteDataSource {
    suspend fun createDeviceLink(): RemoteResult<CreatedDeviceLink>

    suspend fun getDeviceLinkStatus(
        sessionId: String,
        deviceCode: String,
    ): RemoteResult<DeviceLinkStatusResult>

    suspend fun exchangeDeviceLink(
        sessionId: String,
        deviceCode: String,
    ): RemoteResult<RemoteAuthTokens>

    suspend fun refreshSession(refreshToken: String): RemoteResult<RemoteAuthTokens>
}

internal suspend fun <T> remoteCall(block: suspend () -> retrofit2.Response<T>): RemoteResult<T> {
    return try {
        val response = block()
        if (!response.isSuccessful) {
            RemoteResult.Failure(RemoteError.Http(response.code()))
        } else {
            response.body()?.let { RemoteResult.Success(it) }
                ?: RemoteResult.Failure(RemoteError.InvalidResponse)
        }
    } catch (cancelled: CancellationException) {
        throw cancelled
    } catch (timeout: java.net.SocketTimeoutException) {
        RemoteResult.Failure(RemoteError.Timeout)
    } catch (io: IOException) {
        RemoteResult.Failure(RemoteError.Offline)
    } catch (unexpected: Exception) {
        RemoteResult.Failure(RemoteError.Unexpected(unexpected.message ?: "Unexpected auth failure"))
    }
}
