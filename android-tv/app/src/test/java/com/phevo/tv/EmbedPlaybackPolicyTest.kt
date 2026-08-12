package com.phevo.tv

import com.phevo.tv.domain.model.PlaybackBackend
import com.phevo.tv.domain.model.PlaybackSource
import com.phevo.tv.ui.player.EmbedUrlPolicy
import com.phevo.tv.ui.player.PlaybackBackendResolver
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EmbedPlaybackPolicyTest {
    @Test
    fun directSourcesUseNativeMedia3() {
        assertEquals(
            PlaybackBackend.NativeMedia3,
            PlaybackBackendResolver.resolve(PlaybackSource.DirectHls("https://media.example/video.m3u8")),
        )
    }

    @Test
    fun providerEmbedUsesEmbeddedWebBackend() {
        assertEquals(
            PlaybackBackend.EmbeddedWeb,
            PlaybackBackendResolver.resolve(
                PlaybackSource.UnsupportedEmbed("https://v8.streamvsmov.com/video/abc"),
            ),
        )
    }

    @Test
    fun missingHlsAndInvalidSourcesAreUnavailable() {
        assertEquals(PlaybackBackend.Unavailable, PlaybackBackendResolver.resolve(PlaybackSource.Missing))
        assertEquals(PlaybackBackend.Unavailable, PlaybackBackendResolver.resolve(PlaybackSource.HlsUnavailable))
        assertEquals(
            PlaybackBackend.Unavailable,
            PlaybackBackendResolver.resolve(PlaybackSource.Invalid("javascript:alert(1)", "unsafe")),
        )
    }

    @Test
    fun embedPolicyAllowsOnlyHttpsProviderHosts() {
        assertTrue(EmbedUrlPolicy.validateInitialUrl("https://v8.streamvsmov.com/video/abc") is EmbedUrlPolicy.Decision.Allowed)
        assertTrue(EmbedUrlPolicy.validateInitialUrl("http://v8.streamvsmov.com/video/abc") is EmbedUrlPolicy.Decision.Blocked)
        assertTrue(EmbedUrlPolicy.validateInitialUrl("javascript:alert(1)") is EmbedUrlPolicy.Decision.Blocked)
        assertTrue(EmbedUrlPolicy.validateInitialUrl("https://unrelated.example/video") is EmbedUrlPolicy.Decision.Blocked)
        assertTrue(EmbedUrlPolicy.validateInitialUrl("not a url") is EmbedUrlPolicy.Decision.Blocked)
    }
}
