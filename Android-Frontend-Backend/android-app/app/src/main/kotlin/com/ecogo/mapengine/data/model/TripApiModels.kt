package com.ecogo.mapengine.data.model

import com.google.gson.annotations.SerializedName

/**
 * ========================================
 * Trip API related models (backend API integration)
 * Base URL: http://18.141.213.152:8090/api/v1
 * ========================================
 */

// ============================================================
// 1. Start trip POST /mobile/trips/start
// ============================================================

/**
 * Start trip request
 */
data class TripStartRequest(
    @SerializedName("startLng")
    val startLng: Double,

    @SerializedName("startLat")
    val startLat: Double,

    @SerializedName("startAddress")
    val startAddress: String,

    @SerializedName("startPlaceName")
    val startPlaceName: String,

    @SerializedName("startCampusZone")
    val startCampusZone: String? = null
)

/**
 * Start trip response - actually returns a TripResponse object
 */
typealias TripStartResponse = TripDetail

// ============================================================
// 2. Complete trip POST /mobile/trips/{tripId}/complete
// ============================================================

/**
 * Complete trip request
 */
data class TripCompleteRequest(
    @SerializedName("endLng")
    val endLng: Double,

    @SerializedName("endLat")
    val endLat: Double,

    @SerializedName("endAddress")
    val endAddress: String,

    @SerializedName("endPlaceName")
    val endPlaceName: String,

    @SerializedName("endCampusZone")
    val endCampusZone: String? = null,

    @SerializedName("distance")
    val distance: Double,

    @SerializedName("detectedMode")
    val detectedMode: String? = null,

    @SerializedName("mlConfidence")
    val mlConfidence: Double? = null,

    @SerializedName("isGreenTrip")
    val isGreenTrip: Boolean,

    @SerializedName("carbonSaved")
    val carbonSaved: Long,  // Unit: grams (g)

    @SerializedName("transportModes")
    val transportModes: List<TransportModeSegment>,

    @SerializedName("polylinePoints")
    val polylinePoints: List<PolylinePoint>
)

/**
 * Transport mode segment
 */
data class TransportModeSegment(
    @SerializedName("mode")
    val mode: String,

    @SerializedName("subDistance")
    val subDistance: Double,

    @SerializedName("subDuration")
    val subDuration: Int
)

/**
 * Polyline point
 */
data class PolylinePoint(
    @SerializedName("lng")
    val lng: Double,

    @SerializedName("lat")
    val lat: Double
)

/**
 * Complete trip response - actually returns a TripResponse object
 */
typealias TripCompleteResponse = TripDetail

// ============================================================
// 3. Cancel trip POST /mobile/trips/{tripId}/cancel
// ============================================================

/**
 * Cancel trip response
 */
data class TripCancelResponse(
    @SerializedName("tripId")
    val tripId: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("cancelTime")
    val cancelTime: String,

    @SerializedName("message")
    val message: String? = null
)

// ============================================================
// 4. Get trip list GET /mobile/trips
// ============================================================

/**
 * Trip list response
 */
data class TripListResponse(
    @SerializedName("trips")
    val trips: List<TripDetail>,

    @SerializedName("total")
    val total: Int,

    @SerializedName("page")
    val page: Int? = null,

    @SerializedName("pageSize")
    val pageSize: Int? = null
)

// ============================================================
// 5. Get trip details GET /mobile/trips/{tripId}
// ============================================================

/**
 * Trip details
 */
/**
 * Nested coordinate object returned by backend {"lng": ..., "lat": ...}
 */
data class GeoPointObj(
    @SerializedName("lng") val lng: Double = 0.0,
    @SerializedName("lat") val lat: Double = 0.0
)

/**
 * Nested location object returned by backend {"address": ..., "placeName": ..., "campusZone": ...}
 */
data class LocationObj(
    @SerializedName("address") val address: String? = null,
    @SerializedName("placeName") val placeName: String? = null,
    @SerializedName("campusZone") val campusZone: String? = null
)

data class TripDetail(
    @SerializedName(value = "id", alternate = ["tripId"])
    val tripId: String = "",

    @SerializedName("userId")
    val userId: String? = null,

    @SerializedName("startTime")
    val startTime: String = "",

    @SerializedName("endTime")
    val endTime: String? = null,

    @SerializedName(value = "carbonStatus", alternate = ["status"])
    val status: String = "",

    // Backend returns nested object startPoint: {lng, lat}
    @SerializedName("startPoint")
    val startPoint: GeoPointObj? = null,

    // Backend returns nested object startLocation: {address, placeName, campusZone}
    @SerializedName("startLocation")
    val startLocation: LocationObj? = null,

    // Backend returns nested object endPoint: {lng, lat}
    @SerializedName("endPoint")
    val endPoint: GeoPointObj? = null,

    // Backend returns nested object endLocation: {address, placeName, campusZone}
    @SerializedName("endLocation")
    val endLocation: LocationObj? = null,

    @SerializedName("distance")
    val distance: Double? = null,

    @SerializedName("detectedMode")
    val detectedMode: String? = null,

    @SerializedName("mlConfidence")
    val mlConfidence: Double? = null,

    @SerializedName("isGreenTrip")
    val isGreenTrip: Boolean? = null,

    @SerializedName("carbonSaved")
    val carbonSaved: Long? = null,  // Unit: grams (g)

    @SerializedName("pointsGained")
    val pointsGained: Long? = null,

    @SerializedName("transportModes")
    val transportModes: List<TransportModeSegment>? = null,

    @SerializedName("polylinePoints")
    val polylinePoints: List<PolylinePoint>? = null
) {
    // Convenience properties for backward compatibility
    val startLng: Double get() = startPoint?.lng ?: 0.0
    val startLat: Double get() = startPoint?.lat ?: 0.0
    val startAddress: String get() = startLocation?.address ?: ""
    val startPlaceName: String get() = startLocation?.placeName ?: ""
    val endLng: Double? get() = endPoint?.lng
    val endLat: Double? get() = endPoint?.lat
    val endAddress: String? get() = endLocation?.address
    val endPlaceName: String? get() = endLocation?.placeName
}

// ============================================================
// 6. Get current tracking trip GET /mobile/trips/current
// ============================================================

/**
 * Current trip response
 */
data class CurrentTripResponse(
    @SerializedName("hasCurrentTrip")
    val hasCurrentTrip: Boolean,

    @SerializedName("trip")
    val trip: TripDetail? = null
)

// ============================================================
// Generic response wrapper - uses definition from ApiResponse.kt
// ============================================================

/**
 * API error response
 */
data class ApiError(
    @SerializedName("code")
    val code: Int,

    @SerializedName("message")
    val message: String,

    @SerializedName("details")
    val details: String? = null
)
