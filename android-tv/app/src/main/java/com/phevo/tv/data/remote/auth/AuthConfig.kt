package com.phevo.tv.data.remote.auth

import com.phevo.tv.BuildConfig

object AuthConfig {
    val supabaseUrl: String = BuildConfig.SUPABASE_URL.trim().removeSuffix("/")
    val supabaseAnonKey: String = BuildConfig.SUPABASE_ANON_KEY.trim()
    val deviceLinkFunctionUrl: String = BuildConfig.DEVICE_LINK_FUNCTION_URL.trim().let { configured ->
        configured.ifBlank { if (supabaseUrl.isBlank()) "" else "$supabaseUrl/functions/v1/device-link" }
    }.removeSuffix("/")
    val deviceLinkWebUrl: String = BuildConfig.DEVICE_LINK_WEB_URL.trim().removeSuffix("/")

    val isConfigured: Boolean
        get() = supabaseUrl.isNotBlank() &&
            supabaseAnonKey.isNotBlank() &&
            deviceLinkFunctionUrl.isNotBlank() &&
            deviceLinkWebUrl.isNotBlank()
}
