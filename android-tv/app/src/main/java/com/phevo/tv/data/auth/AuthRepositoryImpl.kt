package com.phevo.tv.data.auth

import com.phevo.tv.data.remote.auth.AuthConfig
import com.phevo.tv.data.remote.auth.AuthRemoteDataSource
import com.phevo.tv.data.remote.auth.CreatedDeviceLink
import com.phevo.tv.data.remote.auth.DeviceLinkStatus
import com.phevo.tv.data.remote.auth.RemoteAuthTokens
import com.phevo.tv.data.remote.auth.RemoteError
import com.phevo.tv.data.remote.auth.RemoteResult
import com.phevo.tv.domain.auth.AuthError
import com.phevo.tv.domain.auth.AuthRepository
import com.phevo.tv.domain.auth.AuthResult
import com.phevo.tv.domain.auth.AuthSession
import com.phevo.tv.domain.auth.AuthState
import com.phevo.tv.domain.auth.DeviceLink
import com.phevo.tv.domain.auth.userNamespace
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepositoryImpl(
    private val remote: AuthRemoteDataSource?,
    private val secureSessionStore: SecureSessionStore,
    private val now: () -> Long = { System.currentTimeMillis() },
) : AuthRepository {
    private val _state = MutableStateFlow<AuthState>(AuthState.Guest)
    override val state: StateFlow<AuthState> = _state.asStateFlow()

    private val refreshMutex = Mutex()
    private var generation = 0L
    private var pendingLink: PendingDeviceLink? = null

    override suspend fun restoreSession() {
        val session = secureSessionStore.read()
        if (session == null) {
            _state.value = AuthState.Guest
            return
        }
        if (session.expiresAtEpochMs > now() + REFRESH_SKEW_MS) {
            publishAuthenticated(session)
            return
        }
        val requestGeneration = generation
        when (val result = refreshStoredSession(session, requestGeneration)) {
            is AuthResult.Success -> Unit
            is AuthResult.Failure -> {
                secureSessionStore.clear()
                if (requestGeneration == generation) _state.value = AuthState.Guest
            }
        }
    }

    override suspend fun startDeviceLink(): AuthResult<DeviceLink> {
        val requestGeneration = ++generation
        pendingLink = null
        _state.value = AuthState.CreatingLink
        val source = remote ?: return fail(AuthError.Configuration)
        return when (val result = source.createDeviceLink()) {
            is RemoteResult.Failure -> fail(result.error.toAuthError())
            is RemoteResult.Success -> {
                if (requestGeneration != generation) return fail(AuthError.Unexpected("Auth request was cancelled"))
                val pending = result.value.toPending()
                pendingLink = pending
                val link = pending.publicLink
                _state.value = AuthState.WaitingForApproval(link)
                AuthResult.Success(link)
            }
        }
    }

    override suspend fun waitForApproval(link: DeviceLink): AuthResult<AuthSession> {
        val pending = pendingLink?.takeIf { it.publicLink.sessionId == link.sessionId }
            ?: return fail(AuthError.InvalidCode)
        val requestGeneration = generation
        val source = remote ?: return fail(AuthError.Configuration)

        while (requestGeneration == generation && now() < link.expiresAtEpochMs) {
            when (val status = source.getDeviceLinkStatus(link.sessionId, pending.deviceCode)) {
                is RemoteResult.Failure -> return fail(status.error.toAuthError())
                is RemoteResult.Success -> when (status.value.status) {
                    DeviceLinkStatus.PENDING -> kotlinx.coroutines.delay(POLL_INTERVAL_MS)
                    DeviceLinkStatus.APPROVED -> {
                        if (requestGeneration != generation) return staleRequest()
                        return when (val exchange = source.exchangeDeviceLink(link.sessionId, pending.deviceCode)) {
                            is RemoteResult.Failure -> fail(exchange.error.toAuthError())
                            is RemoteResult.Success -> {
                                if (requestGeneration != generation) return staleRequest()
                                val session = exchange.value.toSession()
                                secureSessionStore.write(session)
                                pendingLink = null
                                if (requestGeneration == generation) publishAuthenticated(session)
                                AuthResult.Success(session)
                            }
                        }
                    }
                    DeviceLinkStatus.EXPIRED -> {
                        if (requestGeneration == generation) _state.value = AuthState.Expired
                        return fail(AuthError.ExpiredCode)
                    }
                    DeviceLinkStatus.CONSUMED -> return fail(AuthError.ConsumedCode)
                }
            }
        }
        if (requestGeneration == generation) _state.value = AuthState.Expired
        return fail(AuthError.ExpiredCode)
    }

    override suspend fun logout() {
        generation++
        pendingLink = null
        secureSessionStore.clear()
        _state.value = AuthState.Guest
    }

    override suspend fun cancelDeviceLink() {
        generation++
        pendingLink = null
        if (_state.value is AuthState.CreatingLink || _state.value is AuthState.WaitingForApproval) {
            _state.value = AuthState.Guest
        }
    }

    private suspend fun refreshStoredSession(session: AuthSession, requestGeneration: Long): AuthResult<AuthSession> =
        refreshMutex.withLock {
            val latest = secureSessionStore.read()
            if (latest != null && latest.expiresAtEpochMs > now() + REFRESH_SKEW_MS) {
                if (requestGeneration == generation) publishAuthenticated(latest)
                return@withLock AuthResult.Success(latest)
            }
            val source = remote ?: return@withLock fail<AuthSession>(AuthError.Configuration)
            when (val result = source.refreshSession(session.refreshToken)) {
                is RemoteResult.Failure -> fail(result.error.toAuthError().asRefreshFailure())
                is RemoteResult.Success -> {
                    if (requestGeneration != generation) return@withLock staleRequest()
                    val refreshed = result.value.toSession()
                    secureSessionStore.write(refreshed)
                    if (requestGeneration == generation) publishAuthenticated(refreshed)
                    AuthResult.Success(refreshed)
                }
            }
        }

    private fun publishAuthenticated(session: AuthSession) {
        _state.value = AuthState.Authenticated(
            userId = session.userId,
            namespace = userNamespace(session.userId),
            expiresAtEpochMs = session.expiresAtEpochMs,
        )
    }

    private fun CreatedDeviceLink.toPending() = PendingDeviceLink(
        publicLink = DeviceLink(sessionId, userCode, verificationUrl, expiresAtEpochMs),
        deviceCode = deviceCode,
    )

    private fun RemoteAuthTokens.toSession() = AuthSession(
        userId = userId,
        accessToken = accessToken,
        refreshToken = refreshToken,
        expiresAtEpochMs = expiresAtEpochMs,
    )

    private fun RemoteError.toAuthError(): AuthError = when (this) {
        RemoteError.Offline -> AuthError.Offline
        RemoteError.Timeout -> AuthError.Timeout
        RemoteError.Configuration -> AuthError.Configuration
        RemoteError.InvalidResponse -> AuthError.ServerUnavailable
        is RemoteError.Http -> when (code) {
            400, 401, 404 -> AuthError.InvalidCode
            409 -> AuthError.ConsumedCode
            408, 429, 500, 502, 503, 504 -> AuthError.ServerUnavailable
            else -> AuthError.Unexpected("Auth server returned HTTP $code")
        }
        is RemoteError.Unexpected -> AuthError.Unexpected(message)
    }

    private fun AuthError.asRefreshFailure(): AuthError = when (this) {
        AuthError.Offline, AuthError.Timeout, AuthError.ServerUnavailable -> this
        else -> AuthError.RefreshFailed
    }

    private fun <T> fail(error: AuthError): AuthResult<T> {
        _state.value = when (error) {
            AuthError.ExpiredCode -> AuthState.Expired
            else -> AuthState.Error(error)
        }
        return AuthResult.Failure(error)
    }

    private fun <T> staleRequest(): AuthResult<T> = AuthResult.Failure(
        AuthError.Unexpected("Stale auth request ignored"),
    )

    private data class PendingDeviceLink(
        val publicLink: DeviceLink,
        val deviceCode: String,
    )

    private companion object {
        const val POLL_INTERVAL_MS = 2_500L
        const val REFRESH_SKEW_MS = 60_000L
    }
}

object AuthRepositoryFactory {
    fun create(context: android.content.Context): AuthRepositoryImpl = AuthRepositoryImpl(
        remote = com.phevo.tv.data.remote.auth.RetrofitAuthRemoteDataSource.create(AuthConfig),
        secureSessionStore = KeystoreSessionStore(context.applicationContext),
    )
}
