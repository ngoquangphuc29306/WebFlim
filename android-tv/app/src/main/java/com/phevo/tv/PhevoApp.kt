package com.phevo.tv

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.phevo.tv.app.navigation.PhevoDestination
import com.phevo.tv.app.navigation.PhevoViewModelFactory
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.data.fake.FakeMovieRepository
import com.phevo.tv.domain.repository.PhevoTvRepository
import com.phevo.tv.ui.account.AccountScreen
import com.phevo.tv.ui.common.NavigationRailItem
import com.phevo.tv.ui.detail.DetailScreen
import com.phevo.tv.ui.detail.DetailViewModel
import com.phevo.tv.ui.explore.ExploreScreen
import com.phevo.tv.ui.history.HistoryScreen
import com.phevo.tv.ui.history.HistoryViewModel
import com.phevo.tv.ui.home.HomeScreen
import com.phevo.tv.ui.home.HomeViewModel
import com.phevo.tv.ui.player.PlayerPlaceholderScreen
import com.phevo.tv.ui.search.SearchScreen
import com.phevo.tv.ui.search.SearchViewModel
import com.phevo.tv.ui.watchlist.WatchlistScreen
import com.phevo.tv.ui.watchlist.WatchlistViewModel

private val railDestinations = listOf(
    PhevoDestination.HOME,
    PhevoDestination.SEARCH,
    PhevoDestination.EXPLORE,
    PhevoDestination.WATCHLIST,
    PhevoDestination.HISTORY,
    PhevoDestination.ACCOUNT,
)

@Composable
fun PhevoApp(repository: PhevoTvRepository = remember { FakeMovieRepository() }) {
    var destination by rememberSaveable { mutableStateOf(PhevoDestination.HOME) }
    var selectedMovieSlug by rememberSaveable { mutableStateOf("dem-trang-tren-bien") }
    var previousDestination by rememberSaveable { mutableStateOf(PhevoDestination.HOME) }

    val contentFocusRequester = remember { FocusRequester() }
    val railFocusRequester = remember { FocusRequester() }

    val homeViewModel: HomeViewModel = viewModel(factory = PhevoViewModelFactory { HomeViewModel(repository) })
    val searchViewModel: SearchViewModel = viewModel(factory = PhevoViewModelFactory { SearchViewModel(repository) })
    val detailViewModel: DetailViewModel = viewModel(factory = PhevoViewModelFactory { DetailViewModel(repository) })
    val watchlistViewModel: WatchlistViewModel = viewModel(factory = PhevoViewModelFactory { WatchlistViewModel(repository) })
    val historyViewModel: HistoryViewModel = viewModel(factory = PhevoViewModelFactory { HistoryViewModel(repository) })

    BackHandler(enabled = destination != PhevoDestination.HOME) {
        destination = when (destination) {
            PhevoDestination.PLAYER -> PhevoDestination.DETAIL
            else -> previousDestination
        }
    }

    LaunchedEffect(destination) {
        contentFocusRequester.requestFocus()
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(PhevoTvColors.AppBackground),
    ) {
        // Show rail only for top-level destinations (not detail/player)
        val showRail = destination != PhevoDestination.PLAYER
        if (showRail) {
            PhevoNavigationRail(
                current = destination,
                onDestinationSelected = { selected ->
                    previousDestination = destination.takeUnless {
                        it == PhevoDestination.PLAYER || it == PhevoDestination.DETAIL
                    } ?: PhevoDestination.HOME
                    destination = selected
                },
                railFocusRequester = railFocusRequester,
                contentFocusRequester = contentFocusRequester,
            )
        }

        Box(
            modifier = Modifier
                .fillMaxHeight()
                .weight(1f)
                .focusGroup()
                .focusProperties { left = railFocusRequester },
        ) {
            when (destination) {
                PhevoDestination.HOME -> HomeScreen(
                    viewModel = homeViewModel,
                    contentFocusRequester = contentFocusRequester,
                    onOpenMovie = { slug ->
                        selectedMovieSlug = slug
                        previousDestination = PhevoDestination.HOME
                        destination = PhevoDestination.DETAIL
                    },
                    onOpenDetail = { slug ->
                        selectedMovieSlug = slug
                        previousDestination = PhevoDestination.HOME
                        destination = PhevoDestination.DETAIL
                    },
                )
                PhevoDestination.SEARCH -> SearchScreen(
                    viewModel = searchViewModel,
                    contentFocusRequester = contentFocusRequester,
                    onOpenDetail = { slug ->
                        selectedMovieSlug = slug
                        previousDestination = PhevoDestination.SEARCH
                        destination = PhevoDestination.DETAIL
                    },
                )
                PhevoDestination.EXPLORE -> ExploreScreen(contentFocusRequester) { destination = PhevoDestination.HOME }
                PhevoDestination.WATCHLIST -> WatchlistScreen(
                    viewModel = watchlistViewModel,
                    contentFocusRequester = contentFocusRequester,
                    onOpenDetail = { slug ->
                        selectedMovieSlug = slug
                        previousDestination = PhevoDestination.WATCHLIST
                        destination = PhevoDestination.DETAIL
                    },
                    onExplore = { destination = PhevoDestination.EXPLORE },
                )
                PhevoDestination.HISTORY -> HistoryScreen(
                    viewModel = historyViewModel,
                    contentFocusRequester = contentFocusRequester,
                    onOpenDetail = { slug ->
                        selectedMovieSlug = slug
                        previousDestination = PhevoDestination.HISTORY
                        destination = PhevoDestination.DETAIL
                    },
                )
                PhevoDestination.ACCOUNT -> AccountScreen(contentFocusRequester)
                PhevoDestination.DETAIL -> DetailScreen(
                    movieSlug = selectedMovieSlug,
                    viewModel = detailViewModel,
                    contentFocusRequester = contentFocusRequester,
                    onPlay = { destination = PhevoDestination.PLAYER },
                    onToggleWatchlist = watchlistViewModel::toggle,
                    onOpenRelated = { slug -> selectedMovieSlug = slug },
                )
                PhevoDestination.PLAYER -> PlayerPlaceholderScreen(selectedMovieSlug, contentFocusRequester) {
                    destination = PhevoDestination.DETAIL
                }
            }
        }
    }
}

@Composable
private fun PhevoNavigationRail(
    current: PhevoDestination,
    onDestinationSelected: (PhevoDestination) -> Unit,
    railFocusRequester: FocusRequester,
    contentFocusRequester: FocusRequester,
) {
    Column(
        modifier = Modifier
            .width(PhevoTvDimensions.NavigationRailWidth)
            .fillMaxHeight()
            .background(PhevoTvColors.RailBackground)
            .padding(vertical = PhevoTvDimensions.SpaceLG, horizontal = PhevoTvDimensions.SpaceSM)
            .focusRequester(railFocusRequester)
            .focusProperties { right = contentFocusRequester },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Brand header
        Text(
            "P",
            style = PhevoTvTypography.DisplayMedium,
            color = PhevoTvColors.BrandPrimary,
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceXL))

        // Navigation items
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(PhevoTvDimensions.SpaceXS),
        ) {
            railDestinations.forEach { item ->
                NavigationRailItem(
                    label = item.label,
                    iconText = item.iconText,
                    selected = current == item,
                    onClick = { onDestinationSelected(item) },
                    modifier = Modifier.focusProperties { right = contentFocusRequester },
                )
            }
        }
    }
}
