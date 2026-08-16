package com.phevo.tv.data.remote.kkphim

import com.phevo.tv.data.remote.kkphim.dto.KkPhimDetailResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimListResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimTaxonomyResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimYearResponseDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface KkPhimApi {
    @GET("v1/api/danh-sach")
    suspend fun latest(@Query("page") page: Int): Response<KkPhimListResponseDto>

    @GET("v1/api/danh-sach/{type}")
    suspend fun listByType(
        @Path("type") type: String,
        @Query("page") page: Int,
    ): Response<KkPhimListResponseDto>

    @GET("v1/api/the-loai/{slug}")
    suspend fun byGenre(
        @Path("slug") slug: String,
        @Query("page") page: Int,
        @Query("country") country: String? = null,
        @Query("year") year: Int? = null,
    ): Response<KkPhimListResponseDto>

    @GET("v1/api/quoc-gia/{slug}")
    suspend fun byCountry(
        @Path("slug") slug: String,
        @Query("page") page: Int,
        @Query("year") year: Int? = null,
    ): Response<KkPhimListResponseDto>

    @GET("v1/api/nam/{year}")
    suspend fun byYear(
        @Path("year") year: Int,
        @Query("page") page: Int,
    ): Response<KkPhimListResponseDto>

    @GET("v1/api/tim-kiem")
    suspend fun search(
        @Query("keyword") keyword: String,
        @Query("page") page: Int,
        @Query("limit") limit: Int = KkPhimConfig.DEFAULT_PAGE_SIZE,
    ): Response<KkPhimListResponseDto>

    @GET("the-loai")
    suspend fun genres(): Response<KkPhimTaxonomyResponseDto>

    @GET("quoc-gia")
    suspend fun countries(): Response<KkPhimTaxonomyResponseDto>

    @GET("nam-phat-hanh")
    suspend fun years(): Response<KkPhimYearResponseDto>

    @GET("v1/api/phim/{slug}")
    suspend fun detail(@Path("slug") slug: String): Response<KkPhimDetailResponseDto>
}
