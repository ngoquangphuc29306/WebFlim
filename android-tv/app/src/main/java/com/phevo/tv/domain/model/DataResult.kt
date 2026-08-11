package com.phevo.tv.domain.model

sealed interface DataError {
    data class Network(val url: String, val cause: String? = null) : DataError
    data class Timeout(val url: String) : DataError
    data class Http(val statusCode: Int, val url: String) : DataError
    data class NotFound(val url: String) : DataError
    data class InvalidResponse(
        val url: String,
        val reason: String,
        val cause: String? = null,
    ) : DataError
    data class EmptyResponse(val url: String) : DataError
    data class InvalidRequest(val reason: String) : DataError
}

sealed interface DataResult<out T> {
    data class Success<T>(val value: T) : DataResult<T>
    data class Failure(val error: DataError) : DataResult<Nothing>
}
