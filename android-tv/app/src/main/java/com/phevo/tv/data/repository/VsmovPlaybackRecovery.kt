package com.phevo.tv.data.repository

import com.phevo.tv.data.remote.vsmov.VsmovClient
import com.phevo.tv.data.remote.vsmov.dto.VsmovDetailResponseDto
import com.phevo.tv.data.remote.vsmov.mapper.VsmovMapper
import com.phevo.tv.domain.model.Episode
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.Server
import java.net.URI
import java.text.Normalizer
import java.util.Locale
import java.util.logging.Logger

internal class VsmovPlaybackRecovery(
    private val fallbackDetail: suspend (String) -> VsmovClient.RequestResult<VsmovDetailResponseDto>,
) {
    private val logger = Logger.getLogger(VsmovPlaybackRecovery::class.java.name)

    suspend fun resolve(detail: MovieDetail, server: Server, episode: Episode): Episode {
        if (hasValidDirectHls(episode.m3u8Url)) {
            logger.fine("VSMov direct source selected movie=${detail.movie.movieSlug} episode=${episode.episodeSlug}")
            return episode
        }
        if (matchesExistingSuspiciousDetailFallback(detail)) {
            logger.fine("HLS recovery skipped movie=${detail.movie.movieSlug} reason=EXISTING_FALLBACK_ALREADY_ATTEMPTED")
            return episode
        }

        val candidates = fallbackCandidates(detail.movie.movieSlug)
        logger.fine(
            "HLS recovery attempted movie=${detail.movie.movieSlug} server=${server.serverName} " +
                "episode=${episode.episodeSlug} candidates=${candidates.size}",
        )
        for (candidate in candidates) {
            val response = when (val result = fallbackDetail(candidate)) {
                is VsmovClient.RequestResult.Success -> result.value
                is VsmovClient.RequestResult.Failure -> {
                    logger.fine("HLS recovery rejected movie=${detail.movie.movieSlug} reason=PHIMAPI_ERROR")
                    continue
                }
            }
            val recovered = VsmovMapper.mapDetail(response)
            if (recovered == null) {
                logger.fine("HLS recovery rejected movie=${detail.movie.movieSlug} reason=INVALID_RESPONSE")
                continue
            }
            if (!MovieIdentityMatcher.matches(detail, recovered, candidate)) {
                logger.fine("HLS recovery rejected movie=${detail.movie.movieSlug} reason=MOVIE_MISMATCH")
                continue
            }
            val recoveredServer = ServerMatcher.find(server.serverName, recovered.servers)
            if (recoveredServer == null) {
                logger.fine("HLS recovery rejected movie=${detail.movie.movieSlug} reason=SERVER_MISMATCH")
                continue
            }
            val recoveredEpisode = EpisodeMatcher.find(episode, recoveredServer.episodes)
            if (recoveredEpisode == null) {
                logger.fine("HLS recovery rejected movie=${detail.movie.movieSlug} reason=EPISODE_MISMATCH")
                continue
            }
            if (!hasValidDirectHls(recoveredEpisode.m3u8Url)) {
                logger.fine("HLS recovery rejected movie=${detail.movie.movieSlug} reason=NO_HLS")
                continue
            }
            logger.fine("HLS recovery accepted movie=${detail.movie.movieSlug} provider=PhimAPI")
            return episode.copy(m3u8Url = recoveredEpisode.m3u8Url?.trim())
        }
        return episode
    }

    private fun matchesExistingSuspiciousDetailFallback(detail: MovieDetail): Boolean {
        val firstEpisodeName = detail.servers.firstOrNull()?.episodes?.firstOrNull()?.name.orEmpty()
        val firstNumber = "\\d+".toRegex().find(firstEpisodeName)?.value?.toIntOrNull()
        return firstNumber != null && firstNumber > 20
    }

    private fun hasValidDirectHls(value: String?): Boolean {
        val trimmed = value?.trim().orEmpty()
        if (trimmed.isEmpty()) return false
        return runCatching {
            val uri = URI(trimmed)
            (uri.scheme.equals("http", true) || uri.scheme.equals("https", true)) &&
                !uri.host.isNullOrBlank() &&
                uri.path.orEmpty().substringAfterLast('.', "").equals("m3u8", true)
        }.getOrDefault(false)
    }

    companion object {
        internal fun fallbackCandidates(slug: String): List<String> = buildList {
            add(slug)
            when (slug) {
                "one-piece" -> add("dao-hai-tac")
                "dao-hai-tac" -> add("one-piece")
            }
        }
    }
}

internal object MovieIdentityMatcher {
    fun matches(primary: MovieDetail, fallback: MovieDetail, requestedSlug: String): Boolean {
        val primarySlug = normalizeSlug(primary.movie.movieSlug)
        val fallbackSlug = normalizeSlug(fallback.movie.movieSlug)
        val requested = normalizeSlug(requestedSlug)
        val trustedSlug = fallbackSlug == requested && requested == primarySlug ||
            isKnownAlias(primarySlug, fallbackSlug)
        if (trustedSlug) {
            return primary.movie.year == null || fallback.movie.year == null || primary.movie.year == fallback.movie.year
        }
        if (primary.movie.year == null || primary.movie.year != fallback.movie.year) return false
        return sameTitle(primary.movie.title, fallback.movie.title) ||
            sameTitle(primary.movie.originalTitle, fallback.movie.originalTitle)
    }

    private fun isKnownAlias(first: String, second: String): Boolean =
        (first == "one-piece" && second == "dao-hai-tac") ||
            (first == "dao-hai-tac" && second == "one-piece")

    private fun sameTitle(first: String?, second: String?): Boolean =
        first != null && second != null && normalizeText(first) == normalizeText(second)

    private fun normalizeSlug(value: String): String = normalizeText(value).replace(" ", "-")

    private fun normalizeText(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace("\\p{InCombiningDiacriticalMarks}+".toRegex(), "")
        .lowercase(Locale.ROOT)
        .replace("đ", "d")
        .replace("[^a-z0-9]+".toRegex(), " ")
        .trim()
}

internal object ServerMatcher {
    fun find(requestedName: String, candidates: List<Server>): Server? {
        val requested = normalizedName(requestedName)
        candidates.firstOrNull { normalizedName(it.serverName) == requested }?.let { return it }
        val requestedFamily = family(requested) ?: return null
        return candidates.firstOrNull { family(normalizedName(it.serverName)) == requestedFamily }
    }

    private fun normalizedName(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace("\\p{InCombiningDiacriticalMarks}+".toRegex(), "")
        .lowercase(Locale.ROOT)
        .replace("đ", "d")
        .replace("#\\s*\\d+".toRegex(), "")
        .replace("[^a-z0-9]+".toRegex(), " ")
        .trim()

    private fun family(value: String): String? = when {
        value.startsWith("vietsub") -> "vietsub"
        value.startsWith("long tieng") -> "long-tieng"
        value.startsWith("thuyet minh") -> "thuyet-minh"
        else -> null
    }
}

internal object EpisodeMatcher {
    fun find(requested: Episode, candidates: List<Episode>): Episode? {
        val requestedKey = key(requested) ?: return null
        return candidates.firstOrNull { key(it) == requestedKey }
    }

    private fun key(episode: Episode): String? {
        val values = listOf(episode.name, episode.episodeSlug).map(::normalizeText)
        if (values.any(::isFull)) return "FULL"
        return values.asSequence()
            .mapNotNull { "\\d+".toRegex().find(it)?.value?.toIntOrNull() }
            .firstOrNull()
            ?.toString()
    }

    private fun isFull(value: String): Boolean = value.replace(" ", "") in setOf(
        "full", "tapfull", "episodefull", "movie", "phimle",
    )

    private fun normalizeText(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace("\\p{InCombiningDiacriticalMarks}+".toRegex(), "")
        .lowercase(Locale.ROOT)
        .replace("đ", "d")
        .replace("[^a-z0-9]+".toRegex(), " ")
        .trim()
}
