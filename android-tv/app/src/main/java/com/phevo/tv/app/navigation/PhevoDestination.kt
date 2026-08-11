package com.phevo.tv.app.navigation

enum class PhevoDestination(
    val label: String,
    val iconText: String,
) {
    HOME("Trang chủ", "⌂"),
    SEARCH("Tìm kiếm", "⌕"),
    EXPLORE("Khám phá", "✦"),
    WATCHLIST("Yêu thích", "♡"),
    HISTORY("Lịch sử", "◷"),
    ACCOUNT("Tài khoản", "◎"),
    DETAIL("Chi tiết", "ⓘ"),
    PLAYER("Phát", "▶"),
}
