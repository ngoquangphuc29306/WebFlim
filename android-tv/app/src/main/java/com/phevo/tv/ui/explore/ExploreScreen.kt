package com.phevo.tv.ui.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvShapes
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.domain.model.TaxonomyItem
import com.phevo.tv.domain.model.YearOption
import com.phevo.tv.domain.repository.CatalogType
import com.phevo.tv.ui.common.PhevoTvButton
import com.phevo.tv.ui.common.PosterMovieCard

private const val ResultColumns = 5

@Composable
fun ExploreScreen(
    viewModel: ExploreViewModel,
    contentFocusRequester: FocusRequester,
    railFocusRequester: FocusRequester,
    onOpenDetail: (String) -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val appliedFilters by viewModel.appliedFilters.collectAsStateWithLifecycle()
    val taxonomy by viewModel.taxonomy.collectAsStateWithLifecycle()
    val panelOpen by viewModel.filterPanelOpen.collectAsStateWithLifecycle()
    val draftFilters by viewModel.draftFilters.collectAsStateWithLifecycle()
    val validationMessage by viewModel.draftValidationMessage.collectAsStateWithLifecycle()
    val focusState by viewModel.focusState.collectAsStateWithLifecycle()
    val content = state as? ExploreUiState.Content

    ExploreResultsFirst(
        content = content,
        taxonomy = taxonomy,
        appliedFilters = appliedFilters,
        focusState = focusState,
        contentFocusRequester = contentFocusRequester,
        railFocusRequester = railFocusRequester,
        onOpenFilterPanel = viewModel::openFilterPanel,
        onRetry = viewModel::applyFilters,
        onLoadNextPage = viewModel::loadNextPage,
        onOpenDetail = onOpenDetail,
        viewModel = viewModel,
    )

    if (panelOpen) {
        ExploreFilterPanel(
            taxonomy = taxonomy,
            draftFilters = draftFilters,
            validationMessage = validationMessage,
            onGenreSelected = viewModel::selectDraftGenre,
            onCountrySelected = viewModel::selectDraftCountry,
            onYearSelected = viewModel::selectDraftYear,
            onTypeSelected = viewModel::selectDraftType,
            onReset = viewModel::resetDraft,
            onCancel = viewModel::cancelFilterPanel,
            onApply = viewModel::applyDraft,
        )
    }
}

@Composable
private fun ExploreResultsFirst(
    content: ExploreUiState.Content?,
    taxonomy: ExploreTaxonomy,
    appliedFilters: ExploreFilterState,
    focusState: com.phevo.tv.domain.model.LogicalFocusState,
    contentFocusRequester: FocusRequester,
    railFocusRequester: FocusRequester,
    onOpenFilterPanel: () -> Unit,
    onRetry: () -> Unit,
    onLoadNextPage: () -> Unit,
    onOpenDetail: (String) -> Unit,
    viewModel: ExploreViewModel,
) {
    val movies = content?.movies.orEmpty()
    val gridState = rememberLazyGridState()
    val resultFocusRequesters = remember { mutableStateMapOf<String, FocusRequester>() }
    val firstResultRequester = remember { FocusRequester() }
    val loading = content == null || content.isLoading
    val errorMessage = content?.errorMessage
    val empty = !loading && errorMessage == null && content != null && movies.isEmpty()
    val activeLabels = appliedFilters.activeLabels()
    val filterLabel = if (activeLabels.isEmpty()) "Bộ lọc" else "Bộ lọc ${activeLabels.size}"

    LaunchedEffect(movies, focusState.selectedItemId) {
        val targetIndex = focusState.selectedItemIndex.coerceIn(0, (movies.size - 1).coerceAtLeast(0))
        if (movies.isNotEmpty()) {
            gridState.scrollToItem(targetIndex)
            focusState.selectedItemId?.let { resultFocusRequesters[it]?.requestFocus() }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(
                top = PhevoTvDimensions.Space2XL,
                start = PhevoTvDimensions.SafeAreaHorizontal,
                end = PhevoTvDimensions.SafeAreaHorizontal,
            ),
        verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD),
    ) {
        Text("Khám phá", style = PhevoTvTypography.DisplayMedium, color = PhevoTvColors.TextPrimary)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
            PhevoTvButton(
                label = filterLabel,
                onClick = onOpenFilterPanel,
                modifier = Modifier
                    .focusRequester(contentFocusRequester)
                    .focusProperties {
                        left = railFocusRequester
                        if (movies.isNotEmpty()) down = firstResultRequester
                    },
            )
            if (activeLabels.isNotEmpty()) {
                Text(
                    activeLabels.joinToString(" • "),
                    style = PhevoTvTypography.BodyMedium,
                    color = PhevoTvColors.TextSecondary,
                    maxLines = 1,
                )
            }
        }

        Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
            when {
                loading -> ExploreLoadingRegion()
                errorMessage != null -> ExploreErrorRegion(errorMessage, onRetry)
                empty -> ExploreEmptyRegion(onOpenFilterPanel)
                else -> LazyVerticalGrid(
                    columns = GridCells.Fixed(ResultColumns),
                    state = gridState,
                    modifier = Modifier.fillMaxSize().focusGroup(),
                    contentPadding = PaddingValues(
                        top = PhevoTvDimensions.SpaceSM,
                        bottom = PhevoTvDimensions.SpaceLG,
                    ),
                    horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.CardGap),
                    verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceXL),
                ) {
                    itemsIndexed(movies, key = { _, movie -> movie.movieSlug }) { index, movie ->
                        val requester = resultFocusRequesters.getOrPut(movie.movieSlug) {
                            if (index == 0) firstResultRequester else FocusRequester()
                        }
                        PosterMovieCard(
                            movie = movie,
                            onClick = { onOpenDetail(movie.movieSlug) },
                            modifier = Modifier
                                .focusRequester(requester)
                                .focusProperties {
                                    if (index < ResultColumns) up = contentFocusRequester
                                    if (index % ResultColumns == 0) left = railFocusRequester
                                },
                            onFocused = {
                                viewModel.rememberFocus(movie.movieSlug, index)
                            },
                        )
                    }
                    if (content != null && content.pagination.currentPage < content.pagination.totalPages) {
                        item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(ResultColumns) }) {
                            PhevoTvButton(
                                label = "Xem thêm",
                                onClick = onLoadNextPage,
                                modifier = Modifier.focusProperties {
                                    up = firstResultRequester
                                    left = railFocusRequester
                                },
                                primary = false,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExploreLoadingRegion() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator(color = PhevoTvColors.BrandPrimary)
        Spacer(Modifier.height(PhevoTvDimensions.SpaceMD))
        Text("Đang tải phim…", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextMuted)
    }
}

@Composable
private fun ExploreErrorRegion(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Không thể tải phim", style = PhevoTvTypography.TitleLarge, color = PhevoTvColors.TextPrimary)
        Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
        Text(message, style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextSecondary)
        Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
        PhevoTvButton("Thử lại", onRetry)
    }
}

@Composable
private fun ExploreEmptyRegion(onChangeFilters: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Không tìm thấy phim phù hợp", style = PhevoTvTypography.TitleLarge, color = PhevoTvColors.TextPrimary)
        Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
        PhevoTvButton("Thay đổi bộ lọc", onChangeFilters)
    }
}

private enum class FilterGroup(val title: String) {
    GENRE("Thể loại"),
    COUNTRY("Quốc gia"),
    YEAR("Năm"),
    TYPE("Loại phim"),
}

@Composable
private fun ExploreFilterPanel(
    taxonomy: ExploreTaxonomy,
    draftFilters: ExploreFilterState,
    validationMessage: String?,
    onGenreSelected: (TaxonomyItem?) -> Unit,
    onCountrySelected: (TaxonomyItem?) -> Unit,
    onYearSelected: (YearOption?) -> Unit,
    onTypeSelected: (CatalogType?) -> Unit,
    onReset: () -> Unit,
    onCancel: () -> Unit,
    onApply: () -> Boolean,
) {
    var activeGroup by remember { mutableStateOf(FilterGroup.GENRE) }
    val groupFocusRequester = remember { FocusRequester() }
    val optionFirstRequester = remember(activeGroup) { FocusRequester() }
    val resetFocusRequester = remember { FocusRequester() }
    val cancelFocusRequester = remember { FocusRequester() }
    val applyFocusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        groupFocusRequester.requestFocus()
    }

    Dialog(
        onDismissRequest = onCancel,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .fillMaxHeight(0.88f)
                .focusGroup(),
            shape = PhevoTvShapes.Panel,
            color = PhevoTvColors.SurfacePrimary,
            tonalElevation = 12.dp,
        ) {
            Column(Modifier.fillMaxSize().padding(PhevoTvDimensions.SpaceXL)) {
                Text("Bộ lọc phim", style = PhevoTvTypography.DisplayMedium, color = PhevoTvColors.TextPrimary)
                Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
                Row(Modifier.weight(1f).fillMaxWidth()) {
                    Column(
                        modifier = Modifier
                            .width(190.dp)
                            .fillMaxHeight()
                            .focusGroup(),
                        verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
                    ) {
                        FilterGroup.entries.forEachIndexed { index, group ->
                            PhevoTvButton(
                                label = group.title,
                                onClick = { activeGroup = group },
                                primary = activeGroup == group,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .then(if (group == FilterGroup.GENRE) Modifier.focusRequester(groupFocusRequester) else Modifier)
                                    .focusProperties {
                                        if (group == activeGroup) right = optionFirstRequester
                                        if (index == FilterGroup.entries.lastIndex) down = FocusRequester.Default
                                    },
                            )
                        }
                    }
                    Spacer(Modifier.width(PhevoTvDimensions.SpaceXL))
                    Box(Modifier.weight(1f).fillMaxHeight()) {
                        when (activeGroup) {
                            FilterGroup.GENRE -> TaxonomyGrid(
                                items = listOf<TaxonomyChoice<TaxonomyItem?>>(TaxonomyChoice(null, "Tất cả")) +
                                    taxonomy.genres.map { TaxonomyChoice(it, it.name) },
                                selected = draftFilters.genre,
                                optionFirstRequester = optionFirstRequester,
                                groupFocusRequester = groupFocusRequester,
                                footerFocusRequester = resetFocusRequester,
                                onSelected = { onGenreSelected(it) },
                            )
                            FilterGroup.COUNTRY -> TaxonomyGrid(
                                items = listOf<TaxonomyChoice<TaxonomyItem?>>(TaxonomyChoice(null, "Tất cả")) +
                                    taxonomy.countries.map { TaxonomyChoice(it, it.name) },
                                selected = draftFilters.country,
                                optionFirstRequester = optionFirstRequester,
                                groupFocusRequester = groupFocusRequester,
                                footerFocusRequester = resetFocusRequester,
                                onSelected = { onCountrySelected(it) },
                            )
                            FilterGroup.YEAR -> YearGrid(
                                years = taxonomy.years,
                                selected = draftFilters.year,
                                optionFirstRequester = optionFirstRequester,
                                groupFocusRequester = groupFocusRequester,
                                footerFocusRequester = resetFocusRequester,
                                onSelected = onYearSelected,
                            )
                            FilterGroup.TYPE -> TypeGrid(
                                selected = draftFilters.type,
                                optionFirstRequester = optionFirstRequester,
                                groupFocusRequester = groupFocusRequester,
                                footerFocusRequester = resetFocusRequester,
                                onSelected = onTypeSelected,
                            )
                        }
                    }
                }
                validationMessage?.let {
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceSM))
                    Text(it, style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.Error)
                }
                Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceMD),
                ) {
                    PhevoTvButton(
                        "Đặt lại",
                        onReset,
                        primary = false,
                        modifier = Modifier
                            .focusRequester(resetFocusRequester)
                            .focusProperties { right = cancelFocusRequester },
                    )
                    Spacer(Modifier.weight(1f))
                    PhevoTvButton(
                        "Hủy",
                        onCancel,
                        primary = false,
                        modifier = Modifier.focusRequester(cancelFocusRequester).focusProperties {
                            left = resetFocusRequester
                            right = applyFocusRequester
                        },
                    )
                    PhevoTvButton(
                        "Áp dụng",
                        { onApply() },
                        modifier = Modifier.focusRequester(applyFocusRequester).focusProperties {
                            left = cancelFocusRequester
                        },
                    )
                }
            }
        }
    }
}

private data class TaxonomyChoice<T>(val value: T, val label: String)

@Composable
private fun <T> TaxonomyGrid(
    items: List<TaxonomyChoice<T>>,
    selected: T,
    optionFirstRequester: FocusRequester,
    groupFocusRequester: FocusRequester,
    footerFocusRequester: FocusRequester,
    onSelected: (T) -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        modifier = Modifier.fillMaxSize().focusGroup(),
        horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
        verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
    ) {
        itemsIndexed(items, key = { index, choice -> "$index-${choice.label}" }) { index, choice ->
            val first = index == 0
            PhevoTvButton(
                label = choice.label,
                onClick = { onSelected(choice.value) },
                primary = choice.value == selected,
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (first) Modifier.focusRequester(optionFirstRequester) else Modifier)
                    .focusProperties {
                        if (first) left = groupFocusRequester
                        if (index == items.lastIndex) down = footerFocusRequester
                    },
            )
        }
    }
}

@Composable
private fun YearGrid(
    years: List<YearOption>,
    selected: YearOption?,
    optionFirstRequester: FocusRequester,
    groupFocusRequester: FocusRequester,
    footerFocusRequester: FocusRequester,
    onSelected: (YearOption?) -> Unit,
) {
    val choices = listOf<YearOption?>(null) + years
    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        modifier = Modifier.fillMaxSize().focusGroup(),
        horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
        verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM),
    ) {
        itemsIndexed(choices, key = { index, item -> item?.slug ?: "all-$index" }) { index, year ->
            PhevoTvButton(
                label = year?.name ?: "Tất cả",
                onClick = { onSelected(year) },
                primary = year?.year == selected?.year,
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (index == 0) Modifier.focusRequester(optionFirstRequester) else Modifier)
                    .focusProperties {
                        if (index == 0) left = groupFocusRequester
                        if (index == choices.lastIndex) down = footerFocusRequester
                    },
            )
        }
    }
}

@Composable
private fun TypeGrid(
    selected: CatalogType?,
    optionFirstRequester: FocusRequester,
    groupFocusRequester: FocusRequester,
    footerFocusRequester: FocusRequester,
    onSelected: (CatalogType?) -> Unit,
) {
    val options = listOf(null to "Tất cả", CatalogType.SERIES to "Phim bộ", CatalogType.SINGLE to "Phim lẻ")
    Row(horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceSM)) {
        options.forEachIndexed { index, (type, label) ->
            PhevoTvButton(
                label = label,
                onClick = { onSelected(type) },
                primary = selected == type,
                modifier = Modifier
                    .then(if (index == 0) Modifier.focusRequester(optionFirstRequester) else Modifier)
                .focusProperties {
                    if (index == 0) left = groupFocusRequester
                    if (index == options.lastIndex) down = footerFocusRequester
                },
            )
        }
    }
}

private fun ExploreFilterState.activeLabels(): List<String> = buildList {
    genre?.name?.let(::add)
    country?.name?.let(::add)
    year?.name?.let(::add)
    type?.let { add(if (it == CatalogType.SERIES) "Phim bộ" else "Phim lẻ") }
}
