package com.phevo.tv.data.remote.auth

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.POST

interface DeviceLinkApi {
    @POST(".")
    suspend fun request(@Body request: DeviceLinkRequestDto): Response<DeviceLinkResponseDto>
}

interface SupabaseAuthApi {
    @FormUrlEncoded
    @POST("auth/v1/token")
    suspend fun refresh(
        @Field("grant_type") grantType: String = "refresh_token",
        @Field("refresh_token") refreshToken: String,
    ): Response<SupabaseTokenResponseDto>
}
