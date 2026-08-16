package com.phevo.tv.domain.auth

data class AuthUser(
    val userId: String,
)

data class AuthSession(
    val userId: String,
    val accessToken: String,
    val refreshToken: String,
    val expiresAtEpochMs: Long,
)

data class DeviceLink(
    val sessionId: String,
    val userCode: String,
    val verificationUrl: String,
    val expiresAtEpochMs: Long,
)

sealed interface AuthError {
    data object Offline : AuthError
    data object Timeout : AuthError
    data object ExpiredCode : AuthError
    data object ConsumedCode : AuthError
    data object InvalidCode : AuthError
    data object ServerUnavailable : AuthError
    data object RefreshFailed : AuthError
    data object Configuration : AuthError
    data class Unexpected(val message: String) : AuthError
}

sealed interface AuthResult<out T> {
    data class Success<T>(val value: T) : AuthResult<T>
    data class Failure(val error: AuthError) : AuthResult<Nothing>
}

sealed interface AuthState {
    data object Guest : AuthState
    data object CreatingLink : AuthState
    data class WaitingForApproval(val link: DeviceLink) : AuthState
    data class Authenticated(
        val userId: String,
        val namespace: String,
        val expiresAtEpochMs: Long,
    ) : AuthState
    data object Expired : AuthState
    data class Error(val error: AuthError) : AuthState
}

fun userNamespace(userId: String?): String = userId
    ?.trim()
    ?.takeIf { it.isNotEmpty() }
    ?.let { "user:$it" }
    ?: "anonymous"
