package com.phevo.tv

import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.ui.player.PlaybackSourceClassifier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackSourceClassifierTest {
    @Test
    fun m3u8PathIsDirectHls() {
        val source = PlaybackSourceClassifier.classify(
            Episode("tap-1", "Tập 1", m3u8Url = "https://media.example/stream/master.m3u8?token=abc"),
        )

        assertEquals(
            PlaybackSource.DirectHls("https://media.example/stream/master.m3u8?token=abc"),
            source,
        )
    }

    @Test
    fun nonHlsDirectFileIsUnavailable() {
        val source = PlaybackSourceClassifier.classify(
            Episode("tap-1", "Tập 1", m3u8Url = "https://media.example/video/movie.mp4"),
        )

        assertEquals(PlaybackSource.HlsUnavailable, source)
    }

    @Test
    fun embedUrlUsesEmbeddedWebEvenWhenQueryMentionsM3u8() {
        val source = PlaybackSourceClassifier.classify(
            Episode(
                "tap-1",
                "Tập 1",
                embedUrl = "https://player.example/embed?id=movie.m3u8",
            ),
        )

        assertEquals(PlaybackSource.UnsupportedEmbed("https://player.example/embed?id=movie.m3u8"), source)
    }

    @Test
    fun blankSourcesAreMissing() {
        assertEquals(
            PlaybackSource.Missing,
            PlaybackSourceClassifier.classify(Episode("tap-1", "Tập 1", embedUrl = "  ")),
        )
    }

    @Test
    fun malformedOrUnsafeUrlsAreInvalid() {
        assertTrue(
            PlaybackSourceClassifier.classify(
                Episode("tap-1", "Tập 1", m3u8Url = "javascript:alert(1)"),
            ) is PlaybackSource.Invalid,
        )
        assertTrue(
            PlaybackSourceClassifier.classify(
                Episode("tap-1", "Tập 1", embedUrl = "not a url"),
            ) is PlaybackSource.Invalid,
        )
    }

    @Test
    fun unknownDirectEndpointIsNotGuessedAsMedia() {
        val source = PlaybackSourceClassifier.classify(
            Episode("tap-1", "Tập 1", m3u8Url = "https://player.example/watch?id=123.m3u8"),
        )

        assertEquals(PlaybackSource.HlsUnavailable, source)
    }
}
