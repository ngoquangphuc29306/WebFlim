package com.phevo.tv.domain.auth

import kotlinx.coroutines.flow.StateFlow

interface AuthRepository {
    val state: StateFlow<AuthState>

    suspend fun restoreSession()

    suspend fun startDeviceLink(): AuthResult<DeviceLink>

    suspend fun waitForApproval(link: DeviceLink): AuthResult<AuthSession>

    suspend fun cancelDeviceLink()

    suspend fun logout()
}
