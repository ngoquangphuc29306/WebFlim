package com.phevo.tv.data.remote.auth

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class DeviceLinkRequestDto(
    val action: String,
    @Json(name = "session_id") val sessionId: String? = null,
    @Json(name = "device_code") val deviceCode: String? = null,
    @Json(name = "user_code") val userCode: String? = null,
)

@JsonClass(generateAdapter = true)
data class DeviceLinkResponseDto(
    @Json(name = "session_id") val sessionId: String? = null,
    @Json(name = "device_code") val deviceCode: String? = null,
    @Json(name = "user_code") val userCode: String? = null,
    @Json(name = "verification_url") val verificationUrl: String? = null,
    @Json(name = "expires_at") val expiresAt: String? = null,
    val status: String? = null,
    @Json(name = "user_id") val userId: String? = null,
    @Json(name = "access_token") val accessToken: String? = null,
    @Json(name = "refresh_token") val refreshToken: String? = null,
    @Json(name = "expires_in") val expiresIn: Long? = null,
)

@JsonClass(generateAdapter = true)
data class SupabaseUserDto(
    val id: String? = null,
)

@JsonClass(generateAdapter = true)
data class SupabaseTokenResponseDto(
    @Json(name = "access_token") val accessToken: String? = null,
    @Json(name = "refresh_token") val refreshToken: String? = null,
    @Json(name = "expires_in") val expiresIn: Long? = null,
    val user: SupabaseUserDto? = null,
)
