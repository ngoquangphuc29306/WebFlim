package com.phevo.tv

import com.phevo.tv.data.auth.AuthRepositoryImpl
import com.phevo.tv.data.auth.SecureSessionStore
import com.phevo.tv.data.remote.auth.AuthRemoteDataSource
import com.phevo.tv.data.remote.auth.CreatedDeviceLink
import com.phevo.tv.data.remote.auth.DeviceLinkStatus
import com.phevo.tv.data.remote.auth.DeviceLinkStatusResult
import com.phevo.tv.data.remote.auth.RemoteAuthTokens
import com.phevo.tv.data.remote.auth.RemoteError
import com.phevo.tv.data.remote.auth.RemoteResult
import com.phevo.tv.domain.auth.AuthError
import com.phevo.tv.domain.auth.AuthResult
import com.phevo.tv.domain.auth.AuthSession
import com.phevo.tv.domain.auth.AuthState
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class AuthRepositoryTest {
    @Test
    fun deviceLinkApprovalExchangesOnceAndPublishesSupabaseUserNamespace() = runTest {
        val remote = FakeAuthRemote(statuses = ArrayDeque(listOf(DeviceLinkStatus.APPROVED)))
        val store = FakeSessionStore()
        val repository = AuthRepositoryImpl(remote, store, now = { 1_000L })

        val link = (repository.startDeviceLink() as AuthResult.Success).value
        val result = repository.waitForApproval(link)

        assertTrue(result is AuthResult.Success)
        assertEquals("user-123", (repository.state.value as AuthState.Authenticated).userId)
        assertEquals("user:user-123", (repository.state.value as AuthState.Authenticated).namespace)
        assertEquals(1, remote.exchangeCalls)
        assertEquals("user-123", store.session?.userId)
    }

    @Test
    fun expiredDeviceLinkDoesNotStoreSession() = runTest {
        val remote = FakeAuthRemote(statuses = ArrayDeque(listOf(DeviceLinkStatus.EXPIRED)))
        val store = FakeSessionStore()
        val repository = AuthRepositoryImpl(remote, store, now = { 1_000L })
        val link = (repository.startDeviceLink() as AuthResult.Success).value

        val result = repository.waitForApproval(link)

        assertEquals(AuthResult.Failure(AuthError.ExpiredCode), result)
        assertEquals(AuthState.Expired, repository.state.value)
        assertNull(store.session)
        assertEquals(0, remote.exchangeCalls)
    }

    @Test
    fun cancellingLinkInvalidatesLateApprovalAndDoesNotAuthenticate() = runTest {
        val remote = FakeAuthRemote(statuses = ArrayDeque(listOf(DeviceLinkStatus.PENDING, DeviceLinkStatus.APPROVED)))
        val store = FakeSessionStore()
        val repository = AuthRepositoryImpl(remote, store, now = { 1_000L })
        val link = (repository.startDeviceLink() as AuthResult.Success).value
        val waitJob = backgroundScope.launch { repository.waitForApproval(link) }

        advanceTimeBy(100L)
        repository.cancelDeviceLink()
        waitJob.cancel()
        waitJob.join()

        assertEquals(AuthState.Guest, repository.state.value)
        assertNull(store.session)
        assertEquals(0, remote.exchangeCalls)
    }

    @Test
    fun logoutDuringApprovedExchangeCannotWriteLateSession() = runTest {
        val remote = FakeAuthRemote(
            statuses = ArrayDeque(listOf(DeviceLinkStatus.APPROVED)),
            exchangeDelayMs = 100L,
        )
        val store = FakeSessionStore()
        val repository = AuthRepositoryImpl(remote, store, now = { 1_000L })
        val link = (repository.startDeviceLink() as AuthResult.Success).value
        val exchange = async { repository.waitForApproval(link) }

        runCurrent()
        repository.logout()
        advanceTimeBy(100L)
        exchange.await()

        assertEquals(AuthState.Guest, repository.state.value)
        assertNull(store.session)
        assertEquals(1, remote.exchangeCalls)
    }

    @Test
    fun logoutClearsSecureSessionAndReturnsToAnonymousNamespace() = runTest {
        val remote = FakeAuthRemote(statuses = ArrayDeque(listOf(DeviceLinkStatus.APPROVED)))
        val store = FakeSessionStore()
        val repository = AuthRepositoryImpl(remote, store, now = { 1_000L })
        val link = (repository.startDeviceLink() as AuthResult.Success).value
        repository.waitForApproval(link)

        repository.logout()

        assertEquals(AuthState.Guest, repository.state.value)
        assertNull(store.session)
        assertEquals(1, store.clearCalls)
    }

    @Test
    fun expiredStoredSessionRefreshesThroughSingleCoordinator() = runTest {
        val remote = FakeAuthRemote(statuses = ArrayDeque(), refreshDelayMs = 100L)
        val store = FakeSessionStore(
            AuthSession("user-123", "old-access", "refresh", expiresAtEpochMs = 500L),
        )
        val repository = AuthRepositoryImpl(remote, store, now = { 1_000L })

        val first = async { repository.restoreSession() }
        val second = async { repository.restoreSession() }
        first.await()
        second.await()

        assertEquals(1, remote.refreshCalls)
        assertEquals("new-access", store.session?.accessToken)
        assertTrue(repository.state.value is AuthState.Authenticated)
    }

    @Test
    fun malformedRemoteResponseDoesNotCreateAuthenticatedState() = runTest {
        val remote = FakeAuthRemote(statuses = ArrayDeque(), createFailure = RemoteError.InvalidResponse)
        val repository = AuthRepositoryImpl(remote, FakeSessionStore(), now = { 1_000L })

        val result = repository.startDeviceLink()

        assertEquals(AuthResult.Failure(AuthError.ServerUnavailable), result)
        assertFalse(repository.state.value is AuthState.Authenticated)
    }
}

private class FakeSessionStore(
    initial: AuthSession? = null,
) : SecureSessionStore {
    var session: AuthSession? = initial
    var clearCalls = 0

    override fun read(): AuthSession? = session
    override fun write(session: AuthSession) { this.session = session }
    override fun clear() {
        clearCalls++
        session = null
    }
}

private class FakeAuthRemote(
    private val statuses: ArrayDeque<DeviceLinkStatus>,
    private val createFailure: RemoteError? = null,
    private val refreshDelayMs: Long = 0L,
    private val exchangeDelayMs: Long = 0L,
) : AuthRemoteDataSource {
    var exchangeCalls = 0
    var refreshCalls = 0

    override suspend fun createDeviceLink(): RemoteResult<CreatedDeviceLink> = createFailure?.let {
        RemoteResult.Failure(it)
    } ?: RemoteResult.Success(
        CreatedDeviceLink(
            sessionId = "session-1",
            deviceCode = "device-secret",
            userCode = "ABCD2345",
            verificationUrl = "https://phevo.example/device-link?session=session-1&code=ABCD2345",
            expiresAtEpochMs = 10_000L,
        ),
    )

    override suspend fun getDeviceLinkStatus(sessionId: String, deviceCode: String): RemoteResult<DeviceLinkStatusResult> {
        val status = statuses.removeFirstOrNull() ?: DeviceLinkStatus.PENDING
        return RemoteResult.Success(DeviceLinkStatusResult(status, if (status == DeviceLinkStatus.APPROVED) "user-123" else null))
    }

    override suspend fun exchangeDeviceLink(sessionId: String, deviceCode: String): RemoteResult<RemoteAuthTokens> {
        exchangeCalls++
        if (exchangeDelayMs > 0L) delay(exchangeDelayMs)
        return RemoteResult.Success(
            RemoteAuthTokens("user-123", "new-access", "new-refresh", 120_000L),
        )
    }

    override suspend fun refreshSession(refreshToken: String): RemoteResult<RemoteAuthTokens> {
        refreshCalls++
        if (refreshDelayMs > 0L) delay(refreshDelayMs)
        return RemoteResult.Success(RemoteAuthTokens("user-123", "new-access", "new-refresh", 120_000L))
    }
}
