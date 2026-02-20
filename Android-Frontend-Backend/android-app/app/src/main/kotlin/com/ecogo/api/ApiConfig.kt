package com.ecogo.api

/**
 * API Configuration
 * Backend server configuration
 */
object ApiConfig {
    /**
     * Base URL
     *
     * Usage:
     * - Emulator accessing localhost: http://10.0.2.2:8090/
     * - Physical device accessing localhost: http://192.168.x.x:8090/ (replace with your computer's IP)
     * - Production: https://your-domain.com/
     */
    const val BASE_URL = "http://13.229.148.21:8090/"

    /**
     * API version
     */
    const val API_VERSION = "v1"

    /**
     * Full API path
     */
    const val API_PATH = "api/$API_VERSION/"

    /**
     * Connection timeout (seconds)
     * Optimized: reduced from 30s to 10s to avoid long waits
     */
    const val CONNECT_TIMEOUT = 10L

    /**
     * Read timeout (seconds)
     * Optimized: reduced from 30s to 15s
     */
    const val READ_TIMEOUT = 15L

    /**
     * Write timeout (seconds)
     * Optimized: reduced from 30s to 15s
     */
    const val WRITE_TIMEOUT = 15L
}
