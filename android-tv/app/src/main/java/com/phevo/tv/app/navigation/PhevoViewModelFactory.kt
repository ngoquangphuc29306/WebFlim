package com.phevo.tv.app.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider

class PhevoViewModelFactory<T : ViewModel>(
    private val createViewModel: () -> T,
) : ViewModelProvider.Factory {
    override fun <VM : ViewModel> create(modelClass: Class<VM>): VM {
        val viewModel = createViewModel()
        require(modelClass.isInstance(viewModel)) { "Unexpected ViewModel type: ${modelClass.name}" }
        return modelClass.cast(viewModel)
    }
}
