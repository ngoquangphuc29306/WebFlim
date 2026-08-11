package com.phevo.tv

import com.phevo.tv.domain.repository.CatalogEndpoint
import com.phevo.tv.domain.repository.CatalogFilters
import com.phevo.tv.domain.repository.CatalogResolver
import com.phevo.tv.domain.repository.CatalogType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CatalogResolverTest {
    @Test
    fun genreHasPriorityAndPreservesAdditionalSupportedFilters() {
        val result = CatalogResolver.resolve(
            CatalogFilters(genre = "hanh-dong", country = "han-quoc", year = 2024, type = CatalogType.SERIES, page = 2),
        )

        assertTrue(result.supported)
        assertEquals(CatalogEndpoint.GENRE, result.request?.endpoint)
        assertEquals("hanh-dong", result.request?.slug)
        assertEquals(2, result.request?.filters?.page)
    }

    @Test
    fun yearAndTypeIsExplicitlyUnsupportedWithoutGenreOrCountry() {
        val result = CatalogResolver.resolve(CatalogFilters(year = 2024, type = CatalogType.SERIES))

        assertFalse(result.supported)
        assertTrue(result.reason.orEmpty().contains("not directly supported"))
    }

    @Test
    fun typeMapsToKnownListSlug() {
        val result = CatalogResolver.resolve(CatalogFilters(type = CatalogType.SERIES))

        assertEquals(CatalogEndpoint.TYPE, result.request?.endpoint)
        assertEquals("phim-bo", result.request?.slug)
    }

    @Test
    fun invalidPageIsClamped() {
        val result = CatalogResolver.resolve(CatalogFilters(page = 0))

        assertEquals(1, result.request?.filters?.page)
    }
}
