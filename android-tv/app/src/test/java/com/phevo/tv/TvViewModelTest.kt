package com.phevo.tv

import com.phevo.tv.data.fake.FakeMovieRepository
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.ui.home.HomeUiState
import com.phevo.tv.ui.home.HomeViewModel
import com.phevo.tv.ui.search.SearchUiState
import com.phevo.tv.ui.search.SearchViewModel
import com.phevo.tv.ui.watchlist.WatchlistViewModel
import com.phevo.tv.ui.history.HistoryViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TvViewModelTest {
    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun homeLoadsFakeContent() = runTest {
        val viewModel = HomeViewModel(FakeMovieRepository())
        advanceUntilIdle()

        val state = viewModel.state.value
        assertTrue(state is HomeUiState.Content)
        assertEquals("dem-trang-tren-bien", (state as HomeUiState.Content).value.heroMovie.movieSlug)
    }

    @Test
    fun homeExposesErrorState() = runTest {
        val viewModel = HomeViewModel(FakeMovieRepository(failHome = true))
        advanceUntilIdle()

        assertTrue(viewModel.state.value is HomeUiState.Error)
    }

    @Test
    fun searchFiltersFakeCatalog() = runTest {
        val viewModel = SearchViewModel(FakeMovieRepository())
        viewModel.updateQuery("thành phố")
        viewModel.submitQuery()
        advanceUntilIdle()

        val state = viewModel.state.value
        assertTrue(state is SearchUiState.Results)
        assertEquals("thanh-pho-khong-ngu", (state as SearchUiState.Results).movies.single().movieSlug)
    }

    @Test
    fun emptySearchDoesNotQueryCatalog() = runTest {
        val viewModel = SearchViewModel(FakeMovieRepository())
        viewModel.submitQuery()

        assertEquals(SearchUiState.EmptyQuery, viewModel.state.value)
    }

    @Test
    fun watchlistToggleIsLocalOnly() = runTest {
        val repository = FakeMovieRepository(emptyWatchlist = true)
        val viewModel = WatchlistViewModel(repository)

        assertTrue(viewModel.movies.value.isEmpty())
        viewModel.toggle("dem-trang-tren-bien")
        assertEquals("dem-trang-tren-bien", viewModel.movies.value.single().movieSlug)
        viewModel.toggle("dem-trang-tren-bien")
        assertTrue(viewModel.movies.value.isEmpty())
    }

    @Test
    fun historyUsesDeterministicProgress() {
        val viewModel = HistoryViewModel(FakeMovieRepository())

        assertEquals(1, viewModel.entries.value.size)
        assertEquals(42, viewModel.entries.value.single().record.progressPercent)
    }

    @Test
    fun logicalFocusStateDoesNotContainComposeFocusObjects() = runTest {
        val viewModel = HomeViewModel(FakeMovieRepository())
        viewModel.rememberFocus("hanh-trinh-cuoi-cung", 2, "series")

        assertEquals(
            LogicalFocusState("hanh-trinh-cuoi-cung", 2, "series"),
            viewModel.focusState.value,
        )
    }
}
