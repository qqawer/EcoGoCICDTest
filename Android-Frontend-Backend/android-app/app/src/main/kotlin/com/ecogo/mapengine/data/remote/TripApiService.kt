package com.ecogo.mapengine.data.remote

import com.ecogo.mapengine.data.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Trip API service interface
 * Base URL: http://13.229.148.21:8090/api/v1
 */
interface TripApiService {

    /**
     * 1. Start trip
     * POST /mobile/trips/start
     * Returns: ResponseMessage<TripResponse>
     */
    @POST("mobile/trips/start")
    suspend fun startTrip(
        @Header("Authorization") authorization: String,
        @Body request: TripStartRequest
    ): Response<ApiResponse<TripStartResponse>>

    /**
     * 2. Complete trip
     * POST /mobile/trips/{tripId}/complete
     * Returns: ResponseMessage<TripResponse>
     */
    @POST("mobile/trips/{tripId}/complete")
    suspend fun completeTrip(
        @Path("tripId") tripId: String,
        @Header("Authorization") authorization: String,
        @Body request: TripCompleteRequest
    ): Response<ApiResponse<TripCompleteResponse>>

    /**
     * 3. Cancel trip
     * POST /mobile/trips/{tripId}/cancel
     * Returns: ResponseMessage<String>
     */
    @POST("mobile/trips/{tripId}/cancel")
    suspend fun cancelTrip(
        @Path("tripId") tripId: String,
        @Header("Authorization") authorization: String
    ): Response<ApiResponse<String>>

    /**
     * 4. Get trip list
     * GET /mobile/trips
     * Returns: ResponseMessage<List<TripSummaryResponse>>
     */
    @GET("mobile/trips")
    suspend fun getTripList(
        @Header("Authorization") authorization: String,
        @Query("page") page: Int? = null,
        @Query("pageSize") pageSize: Int? = null,
        @Query("status") status: String? = null
    ): Response<ApiResponse<List<TripDetail>>>

    /**
     * 5. Get trip details
     * GET /mobile/trips/{tripId}
     * Returns: ResponseMessage<TripResponse>
     */
    @GET("mobile/trips/{tripId}")
    suspend fun getTripDetail(
        @Path("tripId") tripId: String,
        @Header("Authorization") authorization: String
    ): Response<ApiResponse<TripDetail>>

    /**
     * 6. Get current tracking trip
     * GET /mobile/trips/current
     * Returns: ResponseMessage<TripResponse>
     */
    @GET("mobile/trips/current")
    suspend fun getCurrentTrip(
        @Header("Authorization") authorization: String
    ): Response<ApiResponse<TripDetail>>

    /**
     * 7. [Admin] Get all trips
     * GET /web/trips/all
     * Returns: ResponseMessage<List<TripSummaryResponse>>
     */
    @GET("web/trips/all")
    suspend fun getAllTrips(
        @Header("Authorization") authorization: String
    ): Response<ApiResponse<List<TripDetail>>>

    /**
     * 8. [Admin] Get trips for a specific user
     * GET /web/trips/user/{userid}
     * Returns: ResponseMessage<List<TripSummaryResponse>>
     */
    @GET("web/trips/user/{userid}")
    suspend fun getUserTrips(
        @Path("userid") userId: String,
        @Header("Authorization") authorization: String
    ): Response<ApiResponse<List<TripDetail>>>
}
