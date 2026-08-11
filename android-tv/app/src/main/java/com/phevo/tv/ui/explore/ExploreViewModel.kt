package com.phevo.tv.ui.explore

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.phevo.tv.domain.model.DataResult
import com.phevo.tv.domain.model.LogicalFocusState
import com.phevo.tv.domain.model.Pagination
import com.phevo.tv.domain.model.TaxonomyItem
import com.phevo.tv.domain.model.YearOption
import com.phevo.tv.domain.repository.CatalogFilters
import com.phevo.tv.domain.repository.CatalogResolver
import com.phevo.tv.domain.repository.CatalogType
import com.phevo.tv.domain.repository.MovieRepository
import com.phevo.tv.ui.common.toUserMessage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private val PreferredCountrySlugGroups = listOf(
    listOf("trung-quoc"),
    listOf("han-quoc"),
    listOf("au-my", "my", "hoa-ky"),
    listOf("thai-lan"),
    listOf("nhat-ban"),
    listOf("viet-nam"),
)

data class ExploreFilterState(
    val genre: TaxonomyItem? = null,
    val country: TaxonomyItem? = null,
    val year: YearOption? = null,
    val type: CatalogType? = null,
)

data class ExploreTaxonomy(
    val genres: List<TaxonomyItem> = emptyList(),
    val countries: List<TaxonomyItem> = emptyList(),
    val years: List<YearOption> = emptyList(),
)

sealed interface ExploreUiState {
    data object Loading : ExploreUiState

    data class Content(
        val filters: ExploreFilterState,
        val genres: List<TaxonomyItem>,
        val countries: List<TaxonomyItem>,
        val years: List<YearOption>,
        val movies: List<com.phevo.tv.domain.model.Movie>,
        val pagination: Pagination,
        val isLoading: Boolean = false,
        val errorMessage: String? = null,
    ) : ExploreUiState
}

class ExploreViewModel(
    private val repository: MovieRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<ExploreUiState>(ExploreUiState.Loading)
    val state: StateFlow<ExploreUiState> = _state.asStateFlow()

    private val _appliedFilters = MutableStateFlow(ExploreFilterState())
    val appliedFilters: StateFlow<ExploreFilterState> = _appliedFilters.asStateFlow()

    private val _draftFilters = MutableStateFlow(ExploreFilterState())
    val draftFilters: StateFlow<ExploreFilterState> = _draftFilters.asStateFlow()

    private val _taxonomy = MutableStateFlow(ExploreTaxonomy())
    val taxonomy: StateFlow<ExploreTaxonomy> = _taxonomy.asStateFlow()

    private val _filterPanelOpen = MutableStateFlow(false)
    val filterPanelOpen: StateFlow<Boolean> = _filterPanelOpen.asStateFlow()

    private val _draftValidationMessage = MutableStateFlow<String?>(null)
    val draftValidationMessage: StateFlow<String?> = _draftValidationMessage.asStateFlow()

    private val _focusState = MutableStateFlow(LogicalFocusState(restorationKey = "explore-results"))
    val focusState: StateFlow<LogicalFocusState> = _focusState.asStateFlow()

    private var taxonomySnapshot: ExploreTaxonomy? = null
    private var loadJob: Job? = null
    private var requestGeneration = 0

    init {
        applyFilters()
    }

    fun openFilterPanel() {
        _draftFilters.value = _appliedFilters.value
        _draftValidationMessage.value = null
        _filterPanelOpen.value = true
    }

    fun cancelFilterPanel() {
        _draftFilters.value = _appliedFilters.value
        _draftValidationMessage.value = null
        _filterPanelOpen.value = false
    }

    fun resetDraft() {
        _draftFilters.value = ExploreFilterState()
        _draftValidationMessage.value = null
    }

    fun selectDraftGenre(item: TaxonomyItem?) {
        _draftFilters.value = _draftFilters.value.copy(genre = item)
        _draftValidationMessage.value = null
    }

    fun selectDraftCountry(item: TaxonomyItem?) {
        _draftFilters.value = _draftFilters.value.copy(country = item)
        _draftValidationMessage.value = null
    }

    fun selectDraftYear(item: YearOption?) {
        _draftFilters.value = _draftFilters.value.copy(year = item)
        _draftValidationMessage.value = null
    }

    fun selectDraftType(type: CatalogType?) {
        _draftFilters.value = _draftFilters.value.copy(type = type)
        _draftValidationMessage.value = null
    }

    fun applyDraft(): Boolean {
        val nextFilters = _draftFilters.value
        val resolution = CatalogResolver.resolve(nextFilters.toCatalogFilters())
        if (!resolution.supported || resolution.request == null) {
            _draftValidationMessage.value = resolution.reason
                ?: "Bộ lọc này chưa được hỗ trợ."
            return false
        }

        _appliedFilters.value = nextFilters
        _draftValidationMessage.value = null
        _filterPanelOpen.value = false
        startResultLoad(nextFilters)
        return true
    }

    fun applyFilters() {
        startResultLoad(_appliedFilters.value)
    }

    fun loadNextPage() {
        val current = _state.value as? ExploreUiState.Content ?: return
        if (current.isLoading || current.errorMessage != null) return
        if (current.pagination.currentPage >= current.pagination.totalPages) return

        val nextPage = current.pagination.currentPage + 1
        val resolution = CatalogResolver.resolve(
            _appliedFilters.value.toCatalogFilters(page = nextPage),
        )
        val request = resolution.request ?: return
        val generation = ++requestGeneration
        loadJob?.cancel()
        _state.value = current.copy(isLoading = true, errorMessage = null)
        loadJob = viewModelScope.launch {
            try {
                when (val result = repository.getCatalogMovies(request)) {
                    is DataResult.Success -> if (generation == requestGeneration) {
                        _state.value = current.copy(
                            movies = (current.movies + result.value.items).distinctBy { it.movieSlug },
                            pagination = result.value.pagination,
                            isLoading = false,
                            errorMessage = null,
                        )
                    }
                    is DataResult.Failure -> if (generation == requestGeneration) {
                        _state.value = current.copy(
                            isLoading = false,
                            errorMessage = result.error.toUserMessage(),
                        )
                    }
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            }
        }
    }

    fun rememberFocus(itemId: String?, itemIndex: Int, rowKey: String = "explore-results") {
        _focusState.value = LogicalFocusState(itemId, itemIndex, rowKey)
    }

    private fun startResultLoad(filters: ExploreFilterState) {
        val generation = ++requestGeneration
        loadJob?.cancel()
        val current = _state.value as? ExploreUiState.Content
        _state.value = current?.copy(
            filters = filters,
            movies = emptyList(),
            pagination = emptyPagination(),
            isLoading = true,
            errorMessage = null,
        ) ?: ExploreUiState.Loading

        loadJob = viewModelScope.launch {
            try {
                val snapshot = loadTaxonomy()
                val resolution = CatalogResolver.resolve(filters.toCatalogFilters())
                if (!resolution.supported || resolution.request == null) {
                    if (generation == requestGeneration) {
                        _state.value = contentState(
                            filters = filters,
                            snapshot = snapshot,
                            movies = emptyList(),
                            pagination = emptyPagination(),
                            errorMessage = resolution.reason ?: "Bộ lọc này chưa được hỗ trợ.",
                        )
                    }
                    return@launch
                }

                when (val result = repository.getCatalogMovies(resolution.request)) {
                    is DataResult.Success -> if (generation == requestGeneration) {
                        _state.value = contentState(
                            filters = filters,
                            snapshot = snapshot,
                            movies = result.value.items,
                            pagination = result.value.pagination,
                        )
                    }
                    is DataResult.Failure -> if (generation == requestGeneration) {
                        _state.value = contentState(
                            filters = filters,
                            snapshot = snapshot,
                            movies = emptyList(),
                            pagination = emptyPagination(),
                            errorMessage = result.error.toUserMessage(),
                        )
                    }
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            }
        }
    }

    private suspend fun loadTaxonomy(): ExploreTaxonomy = coroutineScope {
        taxonomySnapshot?.let { return@coroutineScope it }
        val genres = async { repository.getGenresList() }
        val countries = async { repository.getCountriesList() }
        val years = async { repository.getYearsList() }
        val snapshot = ExploreTaxonomy(
            genres = (genres.await() as? DataResult.Success)?.value.orEmpty(),
            countries = prioritizeCountries(
                (countries.await() as? DataResult.Success)?.value.orEmpty(),
            ),
            years = (years.await() as? DataResult.Success)?.value.orEmpty(),
        )
        taxonomySnapshot = snapshot
        _taxonomy.value = snapshot
        snapshot
    }

    private fun prioritizeCountries(countries: List<TaxonomyItem>): List<TaxonomyItem> {
        if (countries.isEmpty()) return countries

        val countriesBySlug = countries.associateBy { it.slug }
        val preferred = PreferredCountrySlugGroups.mapNotNull { aliases ->
            aliases.firstNotNullOfOrNull(countriesBySlug::get)
        }
        val preferredSlugs = preferred.mapTo(mutableSetOf()) { it.slug }
        return preferred + countries.filterNot { it.slug in preferredSlugs }
    }

    private fun contentState(
        filters: ExploreFilterState,
        snapshot: ExploreTaxonomy,
        movies: List<com.phevo.tv.domain.model.Movie>,
        pagination: Pagination,
        errorMessage: String? = null,
    ): ExploreUiState.Content = ExploreUiState.Content(
        filters = filters,
        genres = snapshot.genres,
        countries = snapshot.countries,
        years = snapshot.years,
        movies = movies,
        pagination = pagination,
        isLoading = false,
        errorMessage = errorMessage,
    )

    private fun ExploreFilterState.toCatalogFilters(page: Int = 1): CatalogFilters = CatalogFilters(
        genre = genre?.slug,
        country = country?.slug,
        year = year?.year,
        type = type,
        page = page,
    )

    private fun emptyPagination() = Pagination(
        totalItems = 0,
        totalItemsPerPage = 24,
        currentPage = 1,
        totalPages = 1,
    )
}
