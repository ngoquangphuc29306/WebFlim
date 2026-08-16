package com.phevo.tv

import com.phevo.tv.data.fake.FakeMovieRepository
import com.phevo.tv.domain.model.DataError
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.model.Movie
import com.phevo.tv.domain.model.MovieCategory
import com.phevo.tv.domain.model.MovieDetail
import com.phevo.tv.domain.model.MoviePage
import com.phevo.tv.domain.model.MovieType
import com.phevo.tv.domain.model.Pagination
import com.phevo.tv.domain.model.TaxonomyItem
import com.phevo.tv.domain.model.YearOption
import com.phevo.tv.domain.repository.CatalogRequest
import com.phevo.tv.domain.repository.CatalogType
import com.phevo.tv.domain.repository.MovieRepository
import com.phevo.tv.ui.detail.DetailUiState
import com.phevo.tv.ui.detail.DetailViewModel
import com.phevo.tv.ui.explore.ExploreUiState
import com.phevo.tv.ui.explore.ExploreViewModel
import com.phevo.tv.ui.home.HomeUiState
import com.phevo.tv.ui.home.HomeViewModel
import com.phevo.tv.ui.search.SearchUiState
import com.phevo.tv.ui.search.SearchViewModel
import com.phevo.tv.ui.watchlist.WatchlistViewModel
import com.phevo.tv.ui.history.HistoryViewModel
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TvViewModelTest {
    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() { Dispatchers.setMain(testDispatcher) }

    @After
    fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun homeLoadsRealRepositoryShapedContent() = runTest {
        val repository = TestMovieRepository()
        val viewModel = HomeViewModel(repository)
        advanceUntilIdle()

        val state = viewModel.state.value
        assertTrue(state is HomeUiState.Content)
        assertEquals("real-movie", (state as HomeUiState.Content).value.heroMovie.movieSlug)
    }

    @Test
    fun homeExposesProviderErrorAndCanRetry() = runTest {
        val repository = TestMovieRepository(homeFailure = true)
        val viewModel = HomeViewModel(repository)
        advanceUntilIdle()
        assertTrue(viewModel.state.value is HomeUiState.Error)

        repository.homeFailure = false
        viewModel.load()
        advanceUntilIdle()
        assertTrue(viewModel.state.value is HomeUiState.Content)
    }

    @Test
    fun blankSearchDoesNotCallRepository() = runTest {
        val repository = TestMovieRepository()
        val viewModel = SearchViewModel(repository)
        viewModel.submitQuery()

        assertEquals(SearchUiState.EmptyQuery, viewModel.state.value)
        assertEquals(0, repository.searchCalls)
    }

    @Test
    fun searchReturnsNoResults() = runTest {
        val repository = TestMovieRepository(searchPage = MoviePage(emptyList(), Pagination(0, 24, 1, 1)))
        val viewModel = SearchViewModel(repository)
        viewModel.updateQuery("missing")
        viewModel.submitQuery()
        advanceUntilIdle()

        assertEquals(SearchUiState.NoResults, viewModel.state.value)
        assertEquals(1, repository.searchCalls)
    }

    @Test
    fun newerSearchCancelsOlderRequest() = runTest {
        val repository = TestMovieRepository()
        val first = CompletableDeferred<DataResult<MoviePage>>()
        val second = CompletableDeferred<DataResult<MoviePage>>()
        repository.searchResponses["first"] = first
        repository.searchResponses["second"] = second
        val viewModel = SearchViewModel(repository)

        viewModel.updateQuery("first")
        viewModel.submitQuery()
        viewModel.updateQuery("second")
        viewModel.submitQuery()
        second.complete(DataResult.Success(repository.page("second-movie")))
        first.complete(DataResult.Success(repository.page("first-movie")))
        advanceUntilIdle()

        val state = viewModel.state.value as SearchUiState.Results
        assertEquals(listOf("second-movie"), state.movies.map { it.movieSlug })
    }

    @Test
    fun exploreUsesResolverBackedCatalog() = runTest {
        val repository = TestMovieRepository()
        val viewModel = ExploreViewModel(repository)
        advanceUntilIdle()

        assertTrue(viewModel.state.value is ExploreUiState.Content)
        assertEquals(1, repository.catalogCalls)
    }

    @Test
    fun exploreKeepsTheCompleteTaxonomyProvidedByTheRepository() = runTest {
        val genres = (1..13).map { index ->
            TaxonomyItem("genre-$index", "Genre $index", "genre-$index")
        }
        val repository = TestMovieRepository(genres = genres)
        val viewModel = ExploreViewModel(repository)
        advanceUntilIdle()

        val state = viewModel.state.value as ExploreUiState.Content
        assertEquals(genres, state.genres)
    }

    @Test
    fun explorePrioritizesPopularCountriesAndPreservesTheRemainingOrder() = runTest {
        val countries = listOf(
            TaxonomyItem("jp", "Nhật Bản", "nhat-ban"),
            TaxonomyItem("vn", "Việt Nam", "viet-nam"),
            TaxonomyItem("th", "Thái Lan", "thai-lan"),
            TaxonomyItem("us", "Âu Mỹ", "au-my"),
            TaxonomyItem("kr", "Hàn Quốc", "han-quoc"),
            TaxonomyItem("cn", "Trung Quốc", "trung-quoc"),
        )
        val viewModel = ExploreViewModel(TestMovieRepository(countries = countries))
        advanceUntilIdle()

        val state = viewModel.state.value as ExploreUiState.Content
        assertEquals(
            listOf("trung-quoc", "han-quoc", "au-my", "thai-lan", "nhat-ban", "viet-nam"),
            state.countries.map { it.slug },
        )
    }

    @Test
    fun openingExploreFiltersCopiesAppliedStateIntoDraft() = runTest {
        val viewModel = ExploreViewModel(TestMovieRepository())
        advanceUntilIdle()

        viewModel.openFilterPanel()

        assertTrue(viewModel.filterPanelOpen.value)
        assertEquals(viewModel.appliedFilters.value, viewModel.draftFilters.value)
    }

    @Test
    fun editingDraftDoesNotChangeAppliedFiltersOrRequestResults() = runTest {
        val repository = TestMovieRepository()
        val viewModel = ExploreViewModel(repository)
        advanceUntilIdle()
        val initialCalls = repository.catalogCalls

        viewModel.openFilterPanel()
        viewModel.selectDraftYear(YearOption("2024", "2024", "2024", 2024))

        assertEquals(null, viewModel.appliedFilters.value.year)
        assertEquals(2024, viewModel.draftFilters.value.year?.year)
        assertEquals(initialCalls, repository.catalogCalls)
    }

    @Test
    fun cancelDiscardsDraftAndPreservesCurrentResults() = runTest {
        val repository = TestMovieRepository()
        val viewModel = ExploreViewModel(repository)
        advanceUntilIdle()
        val initialCalls = repository.catalogCalls

        viewModel.openFilterPanel()
        viewModel.selectDraftCountry(TaxonomyItem("kr", "Hàn Quốc", "han-quoc"))
        viewModel.cancelFilterPanel()

        assertFalse(viewModel.filterPanelOpen.value)
        assertEquals(null, viewModel.appliedFilters.value.country)
        assertEquals(initialCalls, repository.catalogCalls)
    }

    @Test
    fun resetChangesDraftOnly() = runTest {
        val repository = TestMovieRepository()
        val viewModel = ExploreViewModel(repository)
        advanceUntilIdle()

        viewModel.openFilterPanel()
        viewModel.selectDraftType(CatalogType.SERIES)
        viewModel.resetDraft()

        assertEquals(null, viewModel.draftFilters.value.type)
        assertEquals(null, viewModel.appliedFilters.value.type)
        assertEquals(1, repository.catalogCalls)
    }

    @Test
    fun applyCommitsDraftAndTriggersExactlyOneResultReload() = runTest {
        val repository = TestMovieRepository()
        val viewModel = ExploreViewModel(repository)
        advanceUntilIdle()
        val initialCalls = repository.catalogCalls

        viewModel.openFilterPanel()
        viewModel.selectDraftYear(YearOption("2024", "2024", "2024", 2024))
        assertTrue(viewModel.applyDraft())
        advanceUntilIdle()

        assertFalse(viewModel.filterPanelOpen.value)
        assertEquals(2024, viewModel.appliedFilters.value.year?.year)
        assertEquals(initialCalls + 1, repository.catalogCalls)
    }

    @Test
    fun unsupportedDraftRemainsOpenAndDoesNotRequestResults() = runTest {
        val repository = TestMovieRepository()
        val viewModel = ExploreViewModel(repository)
        advanceUntilIdle()
        val initialCalls = repository.catalogCalls

        viewModel.openFilterPanel()
        viewModel.selectDraftYear(YearOption("2024", "2024", "2024", 2024))
        viewModel.selectDraftType(CatalogType.SERIES)

        assertFalse(viewModel.applyDraft())
        assertTrue(viewModel.filterPanelOpen.value)
        assertEquals(null, viewModel.appliedFilters.value.year)
        assertEquals(initialCalls, repository.catalogCalls)
    }

    @Test
    fun staleExploreResultCannotReplaceTheLatestAppliedResults() = runTest {
        val repository = TestMovieRepository()
        val viewModel = ExploreViewModel(repository)
        advanceUntilIdle()

        val first = CompletableDeferred<DataResult<MoviePage>>()
        val second = CompletableDeferred<DataResult<MoviePage>>()
        repository.catalogResponses[2] = first
        repository.catalogResponses[3] = second

        viewModel.openFilterPanel()
        viewModel.selectDraftYear(YearOption("2024", "2024", "2024", 2024))
        assertTrue(viewModel.applyDraft())
        runCurrent()

        viewModel.openFilterPanel()
        viewModel.selectDraftGenre(TaxonomyItem("action", "HÃ nh Ä‘á»™ng", "action"))
        assertTrue(viewModel.applyDraft())
        runCurrent()

        second.complete(DataResult.Success(repository.page("latest-result")))
        first.complete(DataResult.Success(repository.page("stale-result")))
        advanceUntilIdle()

        val state = viewModel.state.value as ExploreUiState.Content
        assertEquals(listOf("latest-result"), state.movies.map { it.movieSlug })
    }

    @Test
    fun detailLoadsNormalizedMovieAndPreservesPlayerIdentity() = runTest {
        val repository = TestMovieRepository()
        val viewModel = DetailViewModel(repository)
        viewModel.load("real-movie")
        advanceUntilIdle()

        val state = viewModel.state.value as DetailUiState.Content
        val selection = viewModel.selectionFor(state.detail, serverIndex = 0, episodeSlug = "episode-2")
        assertEquals("real-movie", selection.movieSlug)
        assertEquals("episode-2", selection.episodeSlug)
        assertEquals(0, selection.serverIndex)
    }

    @Test
    fun detailContentRendersBeforeRelatedRequestCompletes() = runTest {
        val related = CompletableDeferred<DataResult<MoviePage>>()
        val repository = TestMovieRepository(
            detailFactory = { slug -> detailWithCategory(slug, "action") },
        )
        repository.genreResponses["action"] = related
        val viewModel = DetailViewModel(repository)

        viewModel.load("current")
        runCurrent()

        val content = viewModel.state.value as DetailUiState.Content
        assertEquals("current", content.detail.movie.movieSlug)
        assertTrue(content.relatedLoading)
        assertEquals(1, repository.genreCalls)

        related.complete(DataResult.Success(repository.page("related")))
        advanceUntilIdle()
        assertFalse((viewModel.state.value as DetailUiState.Content).relatedLoading)
    }

    @Test
    fun relatedMoviesExcludeCurrentDeduplicateAndRespectCap() = runTest {
        val current = Movie("current", "Current", type = MovieType.MOVIE)
        val relatedItems = buildList {
            add(current)
            repeat(13) { index ->
                add(Movie("related-$index", "Related $index", type = MovieType.MOVIE))
            }
            add(Movie("related-1", "Duplicate", type = MovieType.MOVIE))
        }
        val repository = TestMovieRepository(
            detailFactory = { detailWithCategory(it, "action") },
        )
        repository.genreResult = DataResult.Success(
            MoviePage(relatedItems, Pagination(relatedItems.size, 24, 1, 1)),
        )
        val viewModel = DetailViewModel(repository)

        viewModel.load("current")
        advanceUntilIdle()

        val content = viewModel.state.value as DetailUiState.Content
        assertEquals(12, content.relatedMovies.size)
        assertEquals(12, content.relatedMovies.map { it.movieSlug }.distinct().size)
        assertFalse(content.relatedMovies.any { it.movieSlug == "current" })
        assertEquals(0, repository.latestCalls)
    }

    @Test
    fun relatedMoviesUseLatestFallbackWhenGenreResultIsShort() = runTest {
        val repository = TestMovieRepository(
            detailFactory = { detailWithCategory(it, "action") },
        )
        repository.genreResult = DataResult.Success(
            MoviePage(
                items = listOf(
                    Movie("current", "Current", type = MovieType.MOVIE),
                    Movie("genre-1", "Genre 1", type = MovieType.MOVIE),
                ),
                Pagination(2, 24, 1, 1),
            ),
        )
        repository.latestResult = DataResult.Success(
            MoviePage(
                items = listOf(
                    Movie("current", "Current", type = MovieType.MOVIE),
                    Movie("latest-1", "Latest 1", type = MovieType.MOVIE),
                    Movie("latest-2", "Latest 2", type = MovieType.MOVIE),
                    Movie("latest-3", "Latest 3", type = MovieType.MOVIE),
                    Movie("latest-4", "Latest 4", type = MovieType.MOVIE),
                ),
                Pagination(5, 24, 1, 1),
            ),
        )
        val viewModel = DetailViewModel(repository)

        viewModel.load("current")
        advanceUntilIdle()

        val content = viewModel.state.value as DetailUiState.Content
        assertEquals(listOf("genre-1", "latest-1", "latest-2", "latest-3", "latest-4"), content.relatedMovies.map { it.movieSlug })
        assertEquals(1, repository.latestCalls)
    }

    @Test
    fun missingPrimaryCategorySlugDoesNotGuessOrRequestGenre() = runTest {
        val repository = TestMovieRepository(
            detailFactory = {
                MovieDetail(
                    movie = Movie(it, "Current", type = MovieType.MOVIE),
                    synopsis = "Synopsis",
                    categories = listOf(MovieCategory("Hành động", null)),
                )
            },
        )
        val viewModel = DetailViewModel(repository)

        viewModel.load("current")
        advanceUntilIdle()

        val content = viewModel.state.value as DetailUiState.Content
        assertTrue(content.relatedMovies.isEmpty())
        assertFalse(content.relatedLoading)
        assertEquals(0, repository.genreCalls)
        assertEquals(0, repository.latestCalls)
    }

    @Test
    fun relatedFailureDoesNotFailPrimaryDetail() = runTest {
        val repository = TestMovieRepository(
            detailFactory = { detailWithCategory(it, "action") },
        )
        repository.genreResult = DataResult.Failure(DataError.Network("genre unavailable"))
        repository.latestResult = DataResult.Failure(DataError.Network("latest unavailable"))
        val viewModel = DetailViewModel(repository)

        viewModel.load("current")
        advanceUntilIdle()

        val content = viewModel.state.value as DetailUiState.Content
        assertEquals("current", content.detail.movie.movieSlug)
        assertTrue(content.relatedMovies.isEmpty())
        assertFalse(content.relatedLoading)
    }

    @Test
    fun staleRelatedResponseCannotOverwriteTheNextDetail() = runTest {
        val first = CompletableDeferred<DataResult<MoviePage>>()
        val second = CompletableDeferred<DataResult<MoviePage>>()
        val repository = TestMovieRepository(
            detailFactory = { slug -> detailWithCategory(slug, "genre-$slug") },
        )
        repository.genreResponses["genre-a"] = first
        repository.genreResponses["genre-b"] = second
        repository.latestResult = DataResult.Success(MoviePage(emptyList(), Pagination(0, 24, 1, 1)))
        val viewModel = DetailViewModel(repository)

        viewModel.load("a")
        runCurrent()
        viewModel.load("b")
        runCurrent()

        second.complete(DataResult.Success(repository.page("related-b")))
        first.complete(DataResult.Success(repository.page("related-a")))
        advanceUntilIdle()

        val content = viewModel.state.value as DetailUiState.Content
        assertEquals("b", content.detail.movie.movieSlug)
        assertEquals(listOf("related-b"), content.relatedMovies.map { it.movieSlug })
    }

    @Test
    fun detailNotFoundIsDistinctFromContent() = runTest {
        val viewModel = DetailViewModel(TestMovieRepository(detailFailure = DataError.NotFound("missing")))
        viewModel.load("missing")
        advanceUntilIdle()

        assertTrue(viewModel.state.value is DetailUiState.NotFound)
    }

    @Test
    fun watchlistAndHistoryRemainLocalOnly() = runTest {
        val repository = FakeMovieRepository(emptyWatchlist = true)
        val watchlist = WatchlistViewModel(repository)
        val history = HistoryViewModel(FakeMovieRepository())

        assertTrue(watchlist.movies.value.isEmpty())
        watchlist.toggle("dem-trang-tren-bien")
        assertEquals("dem-trang-tren-bien", watchlist.movies.value.single().movieSlug)
        assertEquals(1, history.entries.value.size)
    }

    @Test
    fun logicalFocusStateContainsOnlySerializableLogicalValues() = runTest {
        val viewModel = HomeViewModel(TestMovieRepository())
        viewModel.rememberFocus("real-movie", 2, "latest")
        assertEquals(LogicalFocusState("real-movie", 2, "latest"), viewModel.focusState.value)
    }

    private fun detailWithCategory(slug: String, categorySlug: String): MovieDetail = MovieDetail(
        movie = Movie(slug, "Real movie", type = MovieType.SERIES),
        synopsis = "Real synopsis",
        categories = listOf(MovieCategory("Hành động", categorySlug)),
    )
}

private class TestMovieRepository(
    private val searchPage: MoviePage = moviePage("search-movie"),
    private val detailFailure: DataError? = null,
    private val genres: List<TaxonomyItem> = listOf(TaxonomyItem("action", "Hành động", "action")),
    private val countries: List<TaxonomyItem> = listOf(TaxonomyItem("kr", "Hàn Quốc", "han-quoc")),
    private val years: List<YearOption> = listOf(YearOption("2024", "2024", "2024", 2024)),
    var homeFailure: Boolean = false,
    private val detailFactory: ((String) -> MovieDetail)? = null,
) : MovieRepository {
    var searchCalls = 0
    var catalogCalls = 0
    var genreCalls = 0
    var latestCalls = 0
    var genreResult: DataResult<MoviePage> = DataResult.Success(moviePage("genre-movie"))
    var latestResult: DataResult<MoviePage> = DataResult.Success(moviePage("real-movie"))
    val searchResponses = mutableMapOf<String, CompletableDeferred<DataResult<MoviePage>>>()
    val catalogResponses = mutableMapOf<Int, CompletableDeferred<DataResult<MoviePage>>>()
    val genreResponses = mutableMapOf<String, CompletableDeferred<DataResult<MoviePage>>>()

    override suspend fun getLatestMovies(page: Int): DataResult<MoviePage> {
        latestCalls++
        return if (homeFailure) DataResult.Failure(DataError.Network("home")) else latestResult
    }

    override suspend fun getMovieListBySlug(slug: String, page: Int): DataResult<MoviePage> =
        DataResult.Success(page("$slug-movie"))

    override suspend fun getMoviesByGenre(slug: String, page: Int): DataResult<MoviePage> {
        genreCalls++
        return genreResponses[slug]?.let { response ->
            withContext(NonCancellable) { response.await() }
        } ?: genreResult
    }

    override suspend fun getMoviesByCountry(slug: String, page: Int): DataResult<MoviePage> =
        DataResult.Success(page("$slug-movie"))

    override suspend fun getMoviesByYear(year: Int, page: Int): DataResult<MoviePage> =
        DataResult.Success(page("$year-movie"))

    override suspend fun searchMovies(keyword: String, page: Int): DataResult<MoviePage> {
        searchCalls++
        return searchResponses[keyword]?.await() ?: DataResult.Success(searchPage)
    }

    override suspend fun getGenresList(): DataResult<List<TaxonomyItem>> = DataResult.Success(genres)

    override suspend fun getCountriesList(): DataResult<List<TaxonomyItem>> = DataResult.Success(countries)

    override suspend fun getYearsList(): DataResult<List<YearOption>> = DataResult.Success(years)

    override suspend fun getMovieDetail(slug: String): DataResult<MovieDetail> =
        detailFailure?.let { DataResult.Failure(it) }
            ?: DataResult.Success(detailFactory?.invoke(slug) ?: detail(slug))

    override suspend fun getCatalogMovies(request: CatalogRequest): DataResult<MoviePage> {
        catalogCalls++
        return catalogResponses[catalogCalls]?.let { response ->
            withContext(NonCancellable) { response.await() }
        } ?: DataResult.Success(page("catalog-movie"))
    }

    fun page(slug: String): MoviePage = moviePage(slug)

    private fun detail(slug: String): MovieDetail = MovieDetail(
        movie = Movie(slug, "Real movie", type = MovieType.SERIES),
        synopsis = "Real synopsis",
        servers = listOf(
            com.phevo.tv.domain.model.Server(
                "Vietsub",
                listOf(
                    com.phevo.tv.domain.model.Episode("episode-1", "Tập 1"),
                    com.phevo.tv.domain.model.Episode("episode-2", "Tập 2"),
                ),
            ),
        ),
    )

    companion object {
        fun moviePage(slug: String): MoviePage = MoviePage(
            items = listOf(Movie(slug, slug, type = MovieType.MOVIE)),
            pagination = Pagination(1, 24, 1, 1),
        )
    }
}
