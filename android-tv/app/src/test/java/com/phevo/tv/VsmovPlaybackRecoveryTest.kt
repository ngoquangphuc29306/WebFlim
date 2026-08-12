package com.phevo.tv

import com.phevo.tv.data.remote.vsmov.VsmovClient
import com.phevo.tv.data.remote.vsmov.dto.VsmovDetailResponseDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovEpisodeDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovMovieDetailDto
import com.phevo.tv.data.remote.vsmov.dto.VsmovServerDto
import com.phevo.tv.data.repository.VsmovPlaybackRecovery
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.MovieType
import com.phevo.tv.domain.model.Server
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VsmovPlaybackRecoveryTest {
    @Test
    fun directHlsSkipsPhimApiRecovery() = runBlocking {
        var calls = 0
        val result = recovery { calls++ ; failure() }.resolve(detail(), server("Vietsub", episode("Tập 1", m3u8 = "https://vsmov.test/1.m3u8")), episode("Tập 1", m3u8 = "https://vsmov.test/1.m3u8"))

        assertEquals("https://vsmov.test/1.m3u8", result.m3u8Url)
        assertEquals(0, calls)
    }

    @Test
    fun fullMatchesFullAndRecoversHls() = runBlocking {
        val result = recover(episode("Full", embed = "https://embed.test/full"), fallback = response(episodeName = "Full", m3u8 = "https://phim.test/full.m3u8"))

        assertEquals("https://phim.test/full.m3u8", result.m3u8Url)
    }

    @Test
    fun tapFullMatchesFull() = runBlocking {
        val result = recover(episode("tap-full", embed = "https://embed.test/full"), fallback = response(episodeName = "Full", m3u8 = "https://phim.test/full.m3u8"))

        assertEquals("https://phim.test/full.m3u8", result.m3u8Url)
    }

    @Test
    fun numericEpisodeOneMatchesZeroPaddedOne() = runBlocking {
        val result = recover(episode("Tập 1", embed = "https://embed.test/1"), fallback = response(episodeName = "Tập 01"))

        assertEquals("https://phim.test/1.m3u8", result.m3u8Url)
    }

    @Test
    fun numericEpisodeTwelveMatchesEpisodeTwelve() = runBlocking {
        val result = recover(episode("Tập 12", embed = "https://embed.test/12"), fallback = response(episodeName = "Episode 12", m3u8 = "https://phim.test/12.m3u8"))

        assertEquals("https://phim.test/12.m3u8", result.m3u8Url)
    }

    @Test
    fun episode1156DoesNotMatchEpisodeOne() = runBlocking {
        val result = recover(episode("1156", embed = "https://embed.test/1156"), fallback = response(episodeName = "Tập 01"))

        assertNull(result.m3u8Url)
    }

    @Test
    fun episodeEightDoesNotMatchEpisodeNine() = runBlocking {
        val result = recover(episode("Tập 8", embed = "https://embed.test/8"), fallback = response(episodeName = "Tập 9"))

        assertNull(result.m3u8Url)
    }

    @Test
    fun vietsubFamilyMatchesNumberedVietsubServer() = runBlocking {
        val result = recover(episode("Tập 1", embed = "https://embed.test/1"), fallback = response(serverName = "Vietsub #1"))

        assertEquals("https://phim.test/1.m3u8", result.m3u8Url)
    }

    @Test
    fun vietsubDoesNotMatchDubbedServer() = runBlocking {
        val result = recover(episode("Tập 1", embed = "https://embed.test/1"), fallback = response(serverName = "Lồng Tiếng"))

        assertNull(result.m3u8Url)
    }

    @Test
    fun missingPhimApiHlsRetainsOriginalEmbed() = runBlocking {
        val result = recover(episode("Full", embed = "https://embed.test/full"), fallback = response(episodeName = "Full", m3u8 = null))

        assertEquals("https://embed.test/full", result.embedUrl)
        assertNull(result.m3u8Url)
    }

    @Test
    fun phimApiFailureRetainsOriginalEmbed() = runBlocking {
        val result = recovery { failure() }.resolve(detail(), server("Vietsub", episode("Tập 1", embed = "https://embed.test/1")), episode("Tập 1", embed = "https://embed.test/1"))

        assertEquals("https://embed.test/1", result.embedUrl)
        assertNull(result.m3u8Url)
    }

    @Test
    fun movieIdentityMismatchRetainsOriginalEmbed() = runBlocking {
        val result = recover(
            episode("Tập 1", embed = "https://embed.test/1"),
            fallback = response(slug = "other-movie", title = "Other Movie", originalTitle = "Other Original"),
        )

        assertEquals("https://embed.test/1", result.embedUrl)
        assertNull(result.m3u8Url)
    }

    @Test
    fun nonAliasRecoveryUsesOnePhimApiDetailPath() = runBlocking {
        var calls = 0
        val result = recovery { calls++ ; failure() }.resolve(detail(), server("Vietsub", episode("Tập 1", embed = "https://embed.test/1")), episode("Tập 1", embed = "https://embed.test/1"))

        assertNull(result.m3u8Url)
        assertEquals(1, calls)
    }

    @Test
    fun selectedServerAndEpisodeAreMatchedInsteadOfUsingFirstEntries() = runBlocking {
        val fallback = response(
            serverName = "Lồng Tiếng",
            episodeName = "Tập 1",
        ).copy(
            episodes = listOf(
                VsmovServerDto("Lồng Tiếng", listOf(VsmovEpisodeDto(name = "Tập 1", slug = "tap-1", m3u8Url = "https://wrong.test/1.m3u8"))),
                VsmovServerDto("Vietsub #1", listOf(VsmovEpisodeDto(name = "Tập 1", slug = "tap-1", m3u8Url = "https://right.test/1.m3u8"))),
            ),
        )
        val selected = episode("Tập 1", embed = "https://embed.test/1")
        val result = recovery { VsmovClient.RequestResult.Success(fallback) }
            .resolve(detail(), server("Vietsub", selected), selected)

        assertEquals("https://right.test/1.m3u8", result.m3u8Url)
    }

    private fun recover(
        selected: Episode,
        fallback: VsmovDetailResponseDto,
    ): Episode = runBlocking {
        recovery { VsmovClient.RequestResult.Success(fallback) }
            .resolve(detail(), server("Vietsub", selected), selected)
    }

    private fun recovery(
        fallback: suspend (String) -> VsmovClient.RequestResult<VsmovDetailResponseDto>,
    ) = VsmovPlaybackRecovery(fallback)

    private fun detail(): MovieDetail = MovieDetail(
        movie = Movie("movie", "Movie", originalTitle = "Movie Original", year = 2025, type = MovieType.SERIES),
        synopsis = "",
    )

    private fun server(name: String, episode: Episode) = Server(name, listOf(episode))

    private fun episode(name: String, embed: String? = null, m3u8: String? = null) =
        Episode(name.lowercase().replace(' ', '-'), name, embedUrl = embed, m3u8Url = m3u8)

    private fun response(
        slug: String = "movie",
        title: String = "Movie",
        originalTitle: String = "Movie Original",
        year: String = "2025",
        serverName: String = "Vietsub",
        episodeName: String = "Tập 1",
        m3u8: String? = "https://phim.test/1.m3u8",
    ) = VsmovDetailResponseDto(
        status = "true",
        movie = VsmovMovieDetailDto(
            name = title,
            originalName = originalTitle,
            slug = slug,
            year = year,
            type = "series",
        ),
        episodes = listOf(
            VsmovServerDto(
                serverName,
                listOf(
                    VsmovEpisodeDto(
                        name = episodeName,
                        slug = episodeName.lowercase().replace(' ', '-'),
                        m3u8Url = m3u8,
                    ),
                ),
            ),
        ),
    )

    private fun failure() = VsmovClient.RequestResult.Failure(com.phevo.tv.domain.model.DataError.Timeout("test"))
}
