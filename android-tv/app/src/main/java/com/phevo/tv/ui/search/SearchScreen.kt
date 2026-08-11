package com.phevo.tv.ui.search

import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.phevo.tv.app.theme.PhevoTvColors
import com.phevo.tv.app.theme.PhevoTvDimensions
import com.phevo.tv.app.theme.PhevoTvTypography
import com.phevo.tv.ui.common.PhevoTvButton
import com.phevo.tv.ui.common.PosterMovieCard
import com.phevo.tv.ui.common.TvEmptyState
import com.phevo.tv.ui.common.TvErrorState
import com.phevo.tv.ui.common.TvLoadingState

@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    contentFocusRequester: FocusRequester,
    railFocusRequester: FocusRequester,
    onOpenDetail: (String) -> Unit,
) {
    val query by viewModel.query.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val focusState by viewModel.focusState.collectAsStateWithLifecycle()
    val resultFocusRequesters = remember { mutableStateMapOf<String, FocusRequester>() }
    val focusManager = LocalFocusManager.current

    LaunchedEffect(state, focusState.selectedItemId) {
        val initialResultId = (state as? SearchUiState.Results)?.movies?.firstOrNull()?.movieSlug
        val targetId = focusState.selectedItemId ?: initialResultId
        targetId?.let { resultFocusRequesters[it]?.requestFocus() }
    }

    Column(
        modifier = Modifier.fillMaxSize().focusGroup().padding(
            top = PhevoTvDimensions.Space2XL,
            start = PhevoTvDimensions.SafeAreaHorizontal,
            end = PhevoTvDimensions.SafeAreaHorizontal,
        ),
    ) {
        Text("Tìm kiếm", style = PhevoTvTypography.DisplayMedium, color = PhevoTvColors.TextPrimary)
        Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
        OutlinedTextField(
            value = query,
            onValueChange = viewModel::updateQuery,
            modifier = Modifier
                .fillMaxWidth(0.6f)
                .height(60.dp)
                .focusRequester(contentFocusRequester)
                .focusProperties { left = railFocusRequester },
            placeholder = { Text("Tìm tên phim", style = PhevoTvTypography.BodyMedium, color = PhevoTvColors.TextMuted) },
            textStyle = PhevoTvTypography.BodyLarge.copy(color = PhevoTvColors.TextPrimary),
            singleLine = true,
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = PhevoTvColors.BrandPrimary,
                unfocusedBorderColor = PhevoTvColors.BorderSubtle,
                focusedContainerColor = PhevoTvColors.SurfaceSecondary,
                unfocusedContainerColor = PhevoTvColors.SurfacePrimary,
                cursorColor = PhevoTvColors.BrandPrimary,
                focusedTextColor = PhevoTvColors.TextPrimary,
                unfocusedTextColor = PhevoTvColors.TextPrimary,
            ),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = {
                focusManager.clearFocus(force = true)
                viewModel.submitQuery()
            }),
        )
        Spacer(Modifier.height(PhevoTvDimensions.SpaceXL))

        when (val value = state) {
            SearchUiState.EmptyQuery -> TvEmptyState(
                "Bắt đầu tìm kiếm",
                "Nhập tên phim rồi nhấn Tìm kiếm.",
            )
            SearchUiState.Searching -> TvLoadingState()
            SearchUiState.NoResults -> TvEmptyState(
                "Không tìm thấy phim",
                "Thử một từ khóa khác.",
            )
            is SearchUiState.Error -> TvErrorState(message = value.message, onRetry = viewModel::submitQuery)
            is SearchUiState.Results -> {
                Text("Kết quả", style = PhevoTvTypography.TitleLarge, color = PhevoTvColors.TextPrimary)
                Spacer(Modifier.height(PhevoTvDimensions.RowTitleBottomSpacing))
                LazyRow(
                    state = rememberLazyListState(),
                    modifier = Modifier.fillMaxWidth().focusGroup(),
                    contentPadding = PaddingValues(horizontal = PhevoTvDimensions.FocusClipPadding),
                    horizontalArrangement = Arrangement.spacedBy(PhevoTvDimensions.CardGap),
                ) {
                    itemsIndexed(value.movies, key = { _, movie -> movie.movieSlug }) { index, movie ->
                        PosterMovieCard(
                            movie = movie,
                            onClick = { onOpenDetail(movie.movieSlug) },
                            modifier = Modifier
                                .focusRequester(
                                    resultFocusRequesters.getOrPut(movie.movieSlug) { FocusRequester() },
                                )
                                .focusProperties {
                                    up = contentFocusRequester
                                    if (index == 0) left = railFocusRequester
                                },
                            onFocused = { viewModel.rememberFocus(movie.movieSlug, index) },
                        )
                    }
                }
                if (value.pagination.currentPage < value.pagination.totalPages) {
                    Spacer(Modifier.height(PhevoTvDimensions.SpaceLG))
                    PhevoTvButton("Xem thêm", viewModel::loadNextPage, primary = false)
                }
            }
        }
    }
}
