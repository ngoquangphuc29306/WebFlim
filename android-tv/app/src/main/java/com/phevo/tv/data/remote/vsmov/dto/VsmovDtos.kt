package com.phevo.tv.data.remote.vsmov.dto

import com.squareup.moshi.FromJson
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.JsonReader
import com.squareup.moshi.ToJson

@JsonClass(generateAdapter = false)
data class VsmovPaginationDto(
    val totalItems: String? = null,
    val totalItemsPerPage: String? = null,
    val currentPage: String? = null,
    val totalPages: String? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovCategoryDto(
    val id: String? = null,
    @Json(name = "_id") val legacyId: String? = null,
    val name: String? = null,
    val slug: String? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovCountryDto(
    val id: String? = null,
    @Json(name = "_id") val legacyId: String? = null,
    val name: String? = null,
    val slug: String? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovItemDto(
    @Json(name = "_id") val id: String? = null,
    val name: String? = null,
    @Json(name = "origin_name") val originalName: String? = null,
    val slug: String? = null,
    @Json(name = "poster_url") val posterUrl: String? = null,
    @Json(name = "thumb_url") val thumbUrl: String? = null,
    val year: String? = null,
    val type: String? = null,
    val status: String? = null,
    val quality: String? = null,
    val lang: String? = null,
    @Json(name = "episode_current") val episodeCurrent: String? = null,
    @Json(name = "episode_total") val episodeTotal: String? = null,
    val time: String? = null,
    val view: String? = null,
    val tmdb: VsmovTmdbDto? = null,
    val category: List<VsmovCategoryDto>? = null,
    val country: List<VsmovCountryDto>? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovTmdbDto(
    val type: String? = null,
    val id: String? = null,
    val season: String? = null,
    @Json(name = "vote_average") val voteAverage: String? = null,
    @Json(name = "vote_count") val voteCount: String? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovListResponseDto(
    val status: String? = null,
    val items: List<VsmovItemDto>? = null,
    @Json(name = "pathImage") val pathImage: String? = null,
    val pagination: VsmovPaginationDto? = null,
    val msg: String? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovTaxonomyItemDto(
    @Json(name = "_id") val id: String? = null,
    val name: String? = null,
    val slug: String? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovTaxonomyResponseDto(
    val status: String? = null,
    val message: String? = null,
    val data: VsmovTaxonomyDataDto? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovTaxonomyDataDto(
    val items: List<VsmovTaxonomyItemDto>? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovEpisodeDto(
    val name: String? = null,
    val slug: String? = null,
    val filename: String? = null,
    @Json(name = "link_embed") val embedUrl: String? = null,
    @Json(name = "link_m3u8") val m3u8Url: String? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovServerDto(
    @Json(name = "server_name") val serverName: String? = null,
    @Json(name = "server_data") val episodes: List<VsmovEpisodeDto>? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovMovieDetailDto(
    @Json(name = "_id") val id: String? = null,
    val name: String? = null,
    @Json(name = "origin_name") val originalName: String? = null,
    val slug: String? = null,
    @Json(name = "poster_url") val posterUrl: String? = null,
    @Json(name = "thumb_url") val thumbUrl: String? = null,
    val year: String? = null,
    val type: String? = null,
    val status: String? = null,
    val quality: String? = null,
    val lang: String? = null,
    @Json(name = "episode_current") val episodeCurrent: String? = null,
    @Json(name = "episode_total") val episodeTotal: String? = null,
    val time: String? = null,
    val view: String? = null,
    val tmdb: VsmovTmdbDto? = null,
    val category: List<VsmovCategoryDto>? = null,
    val country: List<VsmovCountryDto>? = null,
    val content: String? = null,
    @Json(name = "trailer_url") val trailerUrl: String? = null,
    val keywords: List<String>? = null,
    val actor: List<String>? = null,
    val director: List<String>? = null,
    val showtimes: String? = null,
    val chieurap: Boolean? = null,
)

@JsonClass(generateAdapter = false)
data class VsmovDetailResponseDto(
    val status: String? = null,
    val msg: String? = null,
    val movie: VsmovMovieDetailDto? = null,
    val episodes: List<VsmovServerDto>? = null,
)

/** VSMov and its fallback sometimes encode numbers/booleans inconsistently. */
class VsmovJsonAdapters {
    @FromJson
    fun stringFromJson(reader: JsonReader): String? = when (reader.peek()) {
        JsonReader.Token.NULL -> reader.nextNull()
        JsonReader.Token.STRING, JsonReader.Token.NUMBER -> reader.nextString()
        JsonReader.Token.BOOLEAN -> reader.nextBoolean().toString()
        else -> {
            reader.skipValue()
            null
        }
    }

    @ToJson
    fun stringToJson(value: String?): String? = value
}
