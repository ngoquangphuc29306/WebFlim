package com.phevo.tv.domain.repository

import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.MoviePage
import com.phevo.tv.domain.model.TaxonomyItem
import com.phevo.tv.domain.model.YearOption

interface MovieRepository {
    suspend fun getLatestMovies(page: Int = 1): DataResult<MoviePage>

    suspend fun getMovieListBySlug(slug: String, page: Int = 1): DataResult<MoviePage>

    suspend fun getMoviesByGenre(slug: String, page: Int = 1): DataResult<MoviePage>

    suspend fun getMoviesByCountry(slug: String, page: Int = 1): DataResult<MoviePage>

    suspend fun getMoviesByYear(year: Int, page: Int = 1): DataResult<MoviePage>

    suspend fun searchMovies(keyword: String, page: Int = 1): DataResult<MoviePage>

    suspend fun getGenresList(): DataResult<List<TaxonomyItem>>

    suspend fun getCountriesList(): DataResult<List<TaxonomyItem>>

    suspend fun getYearsList(): DataResult<List<YearOption>>

    suspend fun getMovieDetail(slug: String): DataResult<MovieDetail>

    suspend fun getCatalogMovies(request: CatalogRequest): DataResult<MoviePage>
}
