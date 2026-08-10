package com.phevo.tv.ui.detail

import androidx.lifecycle.ViewModel
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.repository.PhevoTvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class DetailViewModel(
    private val repository: PhevoTvRepository,
) : ViewModel() {
    private val _movieDetail = MutableStateFlow<MovieDetail?>(null)
    val movieDetail: StateFlow<MovieDetail?> = _movieDetail.asStateFlow()

    private val _relatedMovies = MutableStateFlow<List<Movie>>(emptyList())
    val relatedMovies: StateFlow<List<Movie>> = _relatedMovies.asStateFlow()

    fun load(movieSlug: String) {
        val detail = repository.getMovieDetail(movieSlug)
        _movieDetail.value = detail
        _relatedMovies.value = detail?.relatedMovieSlugs?.mapNotNull(repository::getMovie).orEmpty()
    }
}
