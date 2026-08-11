package com.phevo.tv.ui.common

import com.phevo.tv.domain.model.DataError

fun DataError.toUserMessage(): String = when (this) {
    is DataError.Timeout -> "Kết nối mất quá nhiều thời gian."
    is DataError.Network -> "Không thể kết nối tới nguồn phim."
    is DataError.NotFound -> "Không tìm thấy nội dung."
    is DataError.Http -> "Nguồn phim đang tạm thời không khả dụng."
    is DataError.InvalidResponse -> "Nguồn phim trả về dữ liệu không hợp lệ."
    is DataError.EmptyResponse -> "Nguồn phim không có dữ liệu."
    is DataError.InvalidRequest -> "Yêu cầu không hợp lệ."
}
