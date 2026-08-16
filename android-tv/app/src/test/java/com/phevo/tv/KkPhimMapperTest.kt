package com.phevo.tv

import com.phevo.tv.data.remote.kkphim.dto.KkPhimDetailResponseDto
import com.phevo.tv.data.remote.kkphim.dto.KkPhimJsonAdapters
import com.phevo.tv.data.remote.kkphim.dto.KkPhimListResponseDto
import com.phevo.tv.data.remote.kkphim.mapper.KkPhimMapper
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class KkPhimMapperTest {
    private val moshi = Moshi.Builder()
        .add(KkPhimJsonAdapters())
        .add(KotlinJsonAdapterFactory())
        .build()

    @Test
    fun mapsMovieAndPaginationWithoutInventingMissingFields() {
        val response = moshi.adapter(KkPhimListResponseDto::class.java)
            .fromJson(resource("list.json"))!!

        val page = KkPhimMapper.mapList(response)
        val movie = page.items.single()

        assertEquals("mau-phim", movie.movieSlug)
        assertEquals("Mẫu Phim", movie.title)
        assertEquals("https://images.example.test/poster.jpg", movie.posterToken)
        assertEquals("https://images.example.test/thumb.jpg", movie.backdropToken)
        assertEquals(2026, movie.year)
        assertEquals(8.2, movie.rating!!, 0.001)
        assertEquals(49, page.pagination.totalItems)
        assertEquals(2, page.pagination.currentPage)
        assertEquals(3, page.pagination.totalPages)
        assertNull(movie.episodeCurrent)
    }

    @Test
    fun preservesServerAndProviderEpisodeOrderAndSources() {
        val response = moshi.adapter(KkPhimDetailResponseDto::class.java)
            .fromJson(resource("detail-multi-server.json"))!!

        val detail = KkPhimMapper.mapDetail(response)!!

        assertEquals(listOf("Vietsub", "Lồng Tiếng"), detail.servers.map { it.serverName })
        assertEquals(listOf("tap-2", "tap-1"), detail.servers[0].episodes.map { it.episodeSlug })
        assertEquals("https://stream.example.test/2.m3u8", detail.servers[0].episodes[0].m3u8Url)
        assertEquals("https://embed.example.test/2", detail.servers[0].episodes[0].embedUrl)
        assertNull(detail.servers[0].episodes[1].m3u8Url)
        assertEquals("Mô tả mẫu", detail.synopsis)
    }

    @Test
    fun mapsTaxonomyYearsAndRelativeImagesSafely() {
        val taxonomy = moshi.adapter(com.phevo.tv.data.remote.kkphim.dto.KkPhimTaxonomyResponseDto::class.java)
            .fromJson(resource("taxonomy.json"))!!
        val years = moshi.adapter(com.phevo.tv.data.remote.kkphim.dto.KkPhimYearResponseDto::class.java)
            .fromJson(resource("years.json"))!!

        assertEquals("hanh-dong", KkPhimMapper.mapTaxonomy(taxonomy.data!!.items!!.first())!!.slug)
        assertEquals(2026, KkPhimMapper.mapYear(years.data!!.items!!.first())!!.year)
        assertEquals("https://cdn.example.test/art.jpg", KkPhimMapper.normalizeImage("/art.jpg", "https://cdn.example.test/"))
        assertEquals("https://cdn.example.test/art.jpg", KkPhimMapper.normalizeImage("//cdn.example.test/art.jpg", "https://ignored.example.test"))
        assertNull(KkPhimMapper.normalizeImage(null))
        assertTrue(KkPhimMapper.mapDetail(
            moshi.adapter(KkPhimDetailResponseDto::class.java).fromJson(resource("detail-minimal.json"))!!,
        ) == null)
    }

    private fun resource(name: String): String = javaClass.getResource("/kkphim/$name")!!.readText()
}
