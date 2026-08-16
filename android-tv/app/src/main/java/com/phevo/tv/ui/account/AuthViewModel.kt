package com.phevo.tv.ui.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.phevo.tv.domain.auth.AuthRepository
import com.phevo.tv.domain.auth.AuthResult
import com.phevo.tv.domain.auth.AuthState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel(
    private val repository: AuthRepository,
) : ViewModel() {
    val state: StateFlow<AuthState> = repository.state

    private var pollingJob: Job? = null

    init {
        viewModelScope.launch {
            try {
                repository.restoreSession()
            } catch (cancelled: CancellationException) {
                throw cancelled
            }
        }
    }

    fun startDeviceLink() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            try {
                when (val created = repository.startDeviceLink()) {
                    is AuthResult.Failure -> Unit
                    is AuthResult.Success -> repository.waitForApproval(created.value)
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            }
        }
    }

    fun cancelDeviceLink() {
        pollingJob?.cancel()
        pollingJob = null
        viewModelScope.launch { repository.cancelDeviceLink() }
    }

    fun logout() {
        pollingJob?.cancel()
        pollingJob = null
        viewModelScope.launch { repository.logout() }
    }

    override fun onCleared() {
        pollingJob?.cancel()
        super.onCleared()
    }
}
