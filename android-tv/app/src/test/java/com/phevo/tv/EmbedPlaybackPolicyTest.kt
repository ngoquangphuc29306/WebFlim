package com.phevo.tv

import com.phevo.tv.domain.model.PlaybackBackend
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.ui.player.EmbedUrlPolicy
import com.phevo.tv.ui.player.PlaybackBackendResolver
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EmbedPlaybackPolicyTest {
    @Test
    fun directSourcesUseNativeMedia3() {
        assertEquals(
            PlaybackBackend.NativeMedia3,
            PlaybackBackendResolver.resolve(PlaybackSource.DirectHls("https://media.example/video.m3u8")),
        )
        assertEquals(
            PlaybackBackend.NativeMedia3,
            PlaybackBackendResolver.resolve(PlaybackSource.DirectProgressive("https://media.example/video.mp4")),
        )
    }

    @Test
    fun providerEmbedUsesEmbeddedWebBackend() {
        assertEquals(
            PlaybackBackend.EmbeddedWeb,
            PlaybackBackendResolver.resolve(
                PlaybackSource.UnsupportedEmbed("https://v9.streamvsmov.com/video/example"),
            ),
        )
    }

    @Test
    fun missingAndInvalidSourcesAreUnavailable() {
        assertEquals(PlaybackBackend.Unavailable, PlaybackBackendResolver.resolve(PlaybackSource.Missing))
        assertEquals(
            PlaybackBackend.Unavailable,
            PlaybackBackendResolver.resolve(PlaybackSource.Invalid("javascript:alert(1)", "unsafe")),
        )
    }

    @Test
    fun onlyHttpsProviderEmbedHostsAreAllowed() {
        assertTrue(
            EmbedUrlPolicy.validateInitialUrl("https://v9.streamvsmov.com/video/example")
                is EmbedUrlPolicy.Decision.Allowed,
        )
        assertTrue(
            EmbedUrlPolicy.isAllowedNavigation("https://v14.streamvsmov.com/video/next"),
        )
    }

    @Test
    fun unsafeAndUnrelatedNavigationIsBlocked() {
        listOf(
            "http://v9.streamvsmov.com/video/example",
            "javascript:alert(1)",
            "file:///sdcard/movie.html",
            "https://example.com/video",
            "not a url",
        ).forEach { value ->
            assertFalse(EmbedUrlPolicy.isAllowedNavigation(value))
        }
    }
}
