package com.phevo.tv

import androidx.media3.common.PlaybackException
import com.phevo.tv.domain.model.PlayerError
import com.phevo.tv.ui.player.Media3PlaybackErrorMapper
import org.junit.Assert.assertTrue
import org.junit.Test

class Media3PlaybackErrorMapperTest {
    @Test
    fun timeoutAndNetworkCodesMapToTypedErrors() {
        assertTrue(
            Media3PlaybackErrorMapper.mapCode(PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT) is PlayerError.Timeout,
        )
        assertTrue(
            Media3PlaybackErrorMapper.mapCode(
                PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
                "offline",
            ) is PlayerError.Network,
        )
    }

    @Test
    fun unsupportedAndMalformedMediaRemainDistinct() {
        assertTrue(
            Media3PlaybackErrorMapper.mapCode(
                PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED,
                "unsupported",
            ) is PlayerError.UnsupportedFormat,
        )
        assertTrue(
            Media3PlaybackErrorMapper.mapCode(
                PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED,
                "malformed",
            ) is PlayerError.InvalidSource,
        )
    }
}
