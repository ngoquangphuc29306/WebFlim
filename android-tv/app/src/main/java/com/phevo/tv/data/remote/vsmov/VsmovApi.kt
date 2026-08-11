package com.phevo.tv.data.remote.vsmov

import com.phevo.tv.data.remote.vsmov.dto.VsmovDetailResponseDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovListResponseDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovTaxonomyResponseDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface VsmovApi {
    @GET("danh-sach/phim-moi-cap-nhat")
    suspend fun latest(@Query("page") page: Int): Response<VsmovListResponseDto>

    @GET("danh-sach/{slug}")
    suspend fun listBySlug(@Path("slug") slug: String, @Query("page") page: Int): Response<VsmovListResponseDto>

    @GET("the-loai/{slug}")
    suspend fun byGenre(
        @Path("slug") slug: String,
        @Query("page") page: Int,
        @Query("country") country: String? = null,
        @Query("year") year: Int? = null,
        @Query("type") type: String? = null,
    ): Response<VsmovListResponseDto>

    @GET("quoc-gia/{slug}")
    suspend fun byCountry(
        @Path("slug") slug: String,
        @Query("page") page: Int,
        @Query("year") year: Int? = null,
        @Query("type") type: String? = null,
    ): Response<VsmovListResponseDto>

    @GET("nam/{year}")
    suspend fun byYear(@Path("year") year: Int, @Query("page") page: Int): Response<VsmovListResponseDto>

    @GET("tim-kiem")
    suspend fun search(@Query("keyword") keyword: String, @Query("page") page: Int): Response<VsmovListResponseDto>

    @GET("the-loai")
    suspend fun genres(): Response<VsmovTaxonomyResponseDto>

    @GET("quoc-gia")
    suspend fun countries(): Response<VsmovTaxonomyResponseDto>

    @GET("nam")
    suspend fun years(): Response<VsmovTaxonomyResponseDto>

    @GET("phim/{slug}")
    suspend fun detail(@Path("slug") slug: String): Response<VsmovDetailResponseDto>
}

interface PhimApi {
    @GET("phim/{slug}")
    suspend fun detail(@Path("slug") slug: String): Response<VsmovDetailResponseDto>
}
