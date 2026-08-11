package com.phevo.tv

import com.phevo.tv.data.remote.vsmov.dto.VsmovDetailResponseDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovItemDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovMovieDetailDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovServerDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovEpisodeDto
import com.phevo.tv.data.remote.vsmov.mapper.VsmovMapper
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class VsmovMapperTest {
    @Test
    fun listFixtureMapsMovieAndPagination() {
        val json = javaClass.getResource("/vsmov/list.json")!!.readText()
        val response = moshi.adapter(com.phevo.tv.data.remote.vsmov.dto.VsmovListResponseDto::class.java).fromJson(json)!!
        val page = VsmovMapper.mapMoviePage(response.items, response.pagination)

        assertEquals("phim-mot", page.items.single().movieSlug)
        assertEquals("https://vsmov.com/thumb.jpg", page.items.single().posterToken)
        assertEquals(2, page.pagination.currentPage)
        assertEquals(2, page.pagination.totalPages)
    }

    @Test
    fun missingImagesRemainNullAndMissingMetadataDoesNotCrash() {
        val movie = VsmovMapper.mapMovie(VsmovItemDto(slug = "missing-art", name = "Missing Art"))!!

        assertNull(movie.posterToken)
        assertNull(movie.backdropToken)
        assertNull(movie.year)
        assertEquals("HD", movie.quality)
        assertEquals("Vietsub", movie.language)
    }

    @Test
    fun detailPreservesServersAndSortsEpisodesNaturally() {
        val detail = VsmovMapper.mapDetail(
            VsmovDetailResponseDto(
                movie = VsmovMovieDetailDto(slug = "series", name = "Series"),
                episodes = listOf(
                    VsmovServerDto(
                        serverName = "Server 1",
                        episodes = listOf(
                            VsmovEpisodeDto(name = "Tập 10", slug = "tap-10"),
                            VsmovEpisodeDto(name = "Tập 2", slug = "tap-2"),
                        ),
                    ),
                    VsmovServerDto(serverName = "Server 2", episodes = emptyList()),
                ),
            ),
        )!!

        assertEquals(listOf("Tập 2", "Tập 10"), detail.servers.first().episodes.map { it.name })
        assertEquals(2, detail.servers.size)
        assertTrue(detail.servers[1].episodes.isEmpty())
    }

    @Test
    fun imageNormalizerKeepsAbsoluteAndResolvesRelative() {
        assertEquals("https://cdn.example/image.jpg", VsmovMapper.imageUrl("https://cdn.example/image.jpg"))
        assertEquals("https://vsmov.com/storage/image.jpg", VsmovMapper.imageUrl("/storage/image.jpg"))
        assertNull(VsmovMapper.imageUrl("  "))
    }

    private val moshi = Moshi.Builder()
        .add(com.phevo.tv.data.remote.vsmov.dto.VsmovJsonAdapters())
        .add(KotlinJsonAdapterFactory())
        .build()
}
