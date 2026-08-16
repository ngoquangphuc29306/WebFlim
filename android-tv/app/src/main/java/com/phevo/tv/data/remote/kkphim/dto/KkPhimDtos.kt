package com.phevo.tv.data.remote.kkphim.dto

import com.squareup.moshi.FromJson
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.JsonReader
import com.squareup.moshi.ToJson

@JsonClass(generateAdapter = false)
data class KkPhimTmdbDto(
    val id: String? = null,
    val type: String? = null,
    val season: String? = null,
    @Json(name = "vote_average") val voteAverage: String? = null,
    @Json(name = "vote_count") val voteCount: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimImdbDto(
    val id: String? = null,
    @Json(name = "vote_average") val voteAverage: String? = null,
    @Json(name = "vote_count") val voteCount: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimTaxonomyDto(
    val id: String? = null,
    @Json(name = "_id") val legacyId: String? = null,
    val name: String? = null,
    val slug: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimYearDto(
    val year: String? = null,
    val name: String? = null,
    val slug: String? = null,
    val id: String? = null,
    @Json(name = "_id") val legacyId: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimItemDto(
    @Json(name = "_id") val id: String? = null,
    val name: String? = null,
    @Json(name = "origin_name") val originalName: String? = null,
    val slug: String? = null,
    @Json(name = "thumb_url") val thumbUrl: String? = null,
    @Json(name = "poster_url") val posterUrl: String? = null,
    val year: String? = null,
    val type: String? = null,
    val status: String? = null,
    val quality: String? = null,
    val lang: String? = null,
    @Json(name = "episode_current") val episodeCurrent: String? = null,
    @Json(name = "episode_total") val episodeTotal: String? = null,
    val time: String? = null,
    val view: String? = null,
    val tmdb: KkPhimTmdbDto? = null,
    val imdb: KkPhimImdbDto? = null,
    val category: List<KkPhimTaxonomyDto>? = null,
    val country: List<KkPhimTaxonomyDto>? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimEpisodeDto(
    val name: String? = null,
    val slug: String? = null,
    val filename: String? = null,
    @Json(name = "link_embed") val embedUrl: String? = null,
    @Json(name = "link_m3u8") val m3u8Url: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimServerDto(
    @Json(name = "server_name") val serverName: String? = null,
    @Json(name = "server_data") val episodes: List<KkPhimEpisodeDto>? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimPaginationDto(
    val totalItems: String? = null,
    val totalItemsPerPage: String? = null,
    val currentPage: String? = null,
    val totalPages: String? = null,
    val pageRanges: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimListParamsDto(
    val pagination: KkPhimPaginationDto? = null,
    @Json(name = "type_slug") val typeSlug: String? = null,
    val slug: String? = null,
    val sortField: String? = null,
    val sortType: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimListDataDto(
    val items: List<KkPhimItemDto>? = null,
    val params: KkPhimListParamsDto? = null,
    @Json(name = "APP_DOMAIN_CDN_IMAGE") val imageCdn: String? = null,
    @Json(name = "APP_DOMAIN_FRONTEND") val frontend: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimListResponseDto(
    val status: String? = null,
    val message: String? = null,
    val msg: String? = null,
    val data: KkPhimListDataDto? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimDetailItemDto(
    @Json(name = "_id") val id: String? = null,
    val name: String? = null,
    @Json(name = "origin_name") val originalName: String? = null,
    val slug: String? = null,
    @Json(name = "thumb_url") val thumbUrl: String? = null,
    @Json(name = "poster_url") val posterUrl: String? = null,
    val year: String? = null,
    val type: String? = null,
    val status: String? = null,
    val quality: String? = null,
    val lang: String? = null,
    @Json(name = "episode_current") val episodeCurrent: String? = null,
    @Json(name = "episode_total") val episodeTotal: String? = null,
    val time: String? = null,
    val view: String? = null,
    val tmdb: KkPhimTmdbDto? = null,
    val imdb: KkPhimImdbDto? = null,
    val category: List<KkPhimTaxonomyDto>? = null,
    val country: List<KkPhimTaxonomyDto>? = null,
    val content: String? = null,
    @Json(name = "trailer_url") val trailerUrl: String? = null,
    val showtimes: String? = null,
    val actor: List<String>? = null,
    val director: List<String>? = null,
    val chieurap: Boolean? = null,
    val episodes: List<KkPhimServerDto>? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimDetailDataDto(
    val item: KkPhimDetailItemDto? = null,
    @Json(name = "APP_DOMAIN_CDN_IMAGE") val imageCdn: String? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimDetailResponseDto(
    val status: String? = null,
    val message: String? = null,
    val msg: String? = null,
    val data: KkPhimDetailDataDto? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimTaxonomyResponseDto(
    val status: String? = null,
    val message: String? = null,
    val msg: String? = null,
    val data: KkPhimTaxonomyDataDto? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimTaxonomyDataDto(
    val items: List<KkPhimTaxonomyDto>? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimYearResponseDto(
    val status: String? = null,
    val message: String? = null,
    val msg: String? = null,
    val data: KkPhimYearDataDto? = null,
)

@JsonClass(generateAdapter = false)
data class KkPhimYearDataDto(
    val items: List<KkPhimYearDto>? = null,
)

/** KKPhim mixes strings, numbers and booleans in otherwise stable fields. */
class KkPhimJsonAdapters {
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

    @FromJson
    fun booleanFromJson(reader: JsonReader): Boolean? = when (reader.peek()) {
        JsonReader.Token.NULL -> reader.nextNull()
        JsonReader.Token.BOOLEAN -> reader.nextBoolean()
        JsonReader.Token.STRING, JsonReader.Token.NUMBER -> reader.nextString().let {
            it == "1" || it.equals("true", ignoreCase = true)
        }
        else -> {
            reader.skipValue()
            null
        }
    }

    @ToJson
    fun booleanToJson(value: Boolean?): Boolean? = value
}
