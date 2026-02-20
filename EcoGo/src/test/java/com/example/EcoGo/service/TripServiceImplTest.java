package com.example.EcoGo.service;

import com.example.EcoGo.dto.PointsDto;
import com.example.EcoGo.dto.TripDto;
import com.example.EcoGo.exception.BusinessException;
import com.example.EcoGo.exception.errorcode.ErrorCode;
import com.example.EcoGo.interfacemethods.PointsService;
import com.example.EcoGo.interfacemethods.VipSwitchService;
import com.example.EcoGo.model.TransportMode;
import com.example.EcoGo.model.Trip;
import com.example.EcoGo.model.User;
import com.example.EcoGo.repository.TransportModeRepository;
import com.example.EcoGo.repository.TripRepository;
import com.example.EcoGo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceImplTest {

    @Mock
    private TripRepository tripRepository;
    @Mock
    private TransportModeRepository transportModeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PointsService pointsService;
    @Mock
    private VipSwitchService vipSwitchService;

    @Mock
    private org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    @Mock
    private org.springframework.data.mongodb.core.convert.MongoConverter mongoConverter;

    @InjectMocks
    private TripServiceImpl tripService;

    private User testUser;
    private Trip testTrip;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserid("user1");
        testUser.setCurrentPoints(500);
        testUser.setTotalCarbon(50.0);

        testTrip = new Trip();
        testTrip.setId("trip1");
        testTrip.setUserId("user1");
        testTrip.setCarbonStatus("tracking");
        testTrip.setStartTime(LocalDateTime.now());
        testTrip.setCreatedAt(LocalDateTime.now());
        testTrip.setStartPoint(new Trip.GeoPoint(116.0, 39.0));
        testTrip.setStartLocation(new Trip.LocationDetail("Address A", "Place A", "Zone A"));
    }

    // ---------- helpers ----------

    private TripDto.StartTripRequest buildStartRequest() {
        TripDto.StartTripRequest req = new TripDto.StartTripRequest();
        req.startLng = 116.0;
        req.startLat = 39.0;
        req.startAddress = "Address A";
        req.startPlaceName = "Place A";
        req.startCampusZone = "Zone A";
        return req;
    }

    private TripDto.CompleteTripRequest buildCompleteRequest() {
        TripDto.CompleteTripRequest req = new TripDto.CompleteTripRequest();
        req.endLng = 116.1;
        req.endLat = 39.1;
        req.endAddress = "Address B";
        req.endPlaceName = "Place B";
        req.endCampusZone = "Zone B";
        req.distance = 2.5;
        req.detectedMode = "walk";
        req.mlConfidence = 0.95;
        req.isGreenTrip = true;

        TripDto.TransportSegmentDto seg = new TripDto.TransportSegmentDto();
        seg.mode = "walk";
        seg.subDistance = 2.5;
        seg.subDuration = 30;
        req.transportModes = List.of(seg);

        return req;
    }

    // ========== startTrip ==========

    @Test
    void startTrip_success() {
        when(userRepository.findByUserid("user1")).thenReturn(Optional.of(testUser));
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));

        Trip result = tripService.startTrip("user1", buildStartRequest());

        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals("user1", result.getUserId());
        assertEquals("tracking", result.getCarbonStatus());
        assertEquals(116.0, result.getStartPoint().getLng());
        assertEquals(39.0, result.getStartPoint().getLat());
        assertEquals("Address A", result.getStartLocation().getAddress());
    }

    @Test
    void startTrip_userNotFound() {
        when(userRepository.findByUserid("nonexistent")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.startTrip("nonexistent", buildStartRequest()));
        assertEquals(ErrorCode.USER_NOT_FOUND.getCode(), ex.getCode());
    }

    // ========== completeTrip ==========

    @Test
    void completeTrip_success_nonVip() {
        // carbonFactor=0 means walk emits 0 g/km, so savings = (100-0)*distance
        TransportMode walkMode = new TransportMode("1", "walk", "Walking", 0, "icon", 1, true);

        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));
        when(transportModeRepository.findByMode("walk")).thenReturn(Optional.of(walkMode));
        when(userRepository.findByUserid("user1")).thenReturn(Optional.of(testUser));
        when(vipSwitchService.isSwitchEnabled("Double_points")).thenReturn(false);
        when(pointsService.formatTripDescription(anyString(), anyString(), anyDouble()))
                .thenReturn("Place A -> Place B (2.5km)");
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));

        Trip result = tripService.completeTrip("user1", "trip1", buildCompleteRequest());

        assertEquals("completed", result.getCarbonStatus());
        assertNotNull(result.getEndPoint());
        assertNotNull(result.getEndLocation());
        // carbonSaved = (100 - 0) * 2.5 / 100 = 2.5
        assertEquals(2.5, result.getCarbonSaved(), 0.01);
        // basePoints = round(2.5 * 100) = 250, not VIP so no doubling
        assertEquals(250, result.getPointsGained());
        verify(pointsService).settle(eq("user1"), any(PointsDto.SettleResult.class));
        verify(userRepository).save(testUser);
    }

    @Test
    void completeTrip_success_vipDoublePoints() {
        User.Vip vip = new User.Vip();
        vip.setActive(true);
        testUser.setVip(vip);

        TransportMode walkMode = new TransportMode("1", "walk", "Walking", 0, "icon", 1, true);

        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));
        when(transportModeRepository.findByMode("walk")).thenReturn(Optional.of(walkMode));
        when(userRepository.findByUserid("user1")).thenReturn(Optional.of(testUser));
        when(vipSwitchService.isSwitchEnabled("Double_points")).thenReturn(true);
        when(pointsService.formatTripDescription(anyString(), anyString(), anyDouble())).thenReturn("desc");
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));

        Trip result = tripService.completeTrip("user1", "trip1", buildCompleteRequest());

        // basePoints = 250, VIP with double enabled = 500
        assertEquals(500, result.getPointsGained());
    }

    @Test
    void completeTrip_tripNotFound() {
        when(tripRepository.findById("nonexistent")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.completeTrip("user1", "nonexistent", buildCompleteRequest()));
        assertEquals(ErrorCode.TRIP_NOT_FOUND.getCode(), ex.getCode());
    }

    @Test
    void completeTrip_noPermission() {
        testTrip.setUserId("otherUser");
        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.completeTrip("user1", "trip1", buildCompleteRequest()));
        assertEquals(ErrorCode.NO_PERMISSION.getCode(), ex.getCode());
    }

    @Test
    void completeTrip_wrongStatus() {
        testTrip.setCarbonStatus("completed");
        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.completeTrip("user1", "trip1", buildCompleteRequest()));
        assertEquals(ErrorCode.TRIP_STATUS_ERROR.getCode(), ex.getCode());
    }

    @Test
    void completeTrip_noTransportModes() {
        TripDto.CompleteTripRequest req = buildCompleteRequest();
        req.transportModes = null;

        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));
        when(userRepository.findByUserid("user1")).thenReturn(Optional.of(testUser));
        when(vipSwitchService.isSwitchEnabled("Double_points")).thenReturn(false);
        when(pointsService.formatTripDescription(anyString(), anyString(), anyDouble())).thenReturn("desc");
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));

        Trip result = tripService.completeTrip("user1", "trip1", req);

        assertEquals(0.0, result.getCarbonSaved());
        assertEquals(0, result.getPointsGained());
    }

    @Test
    void completeTrip_updatesTotalCarbon() {
        TransportMode walkMode = new TransportMode("1", "walk", "Walking", 0, "icon", 1, true);

        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));
        when(transportModeRepository.findByMode("walk")).thenReturn(Optional.of(walkMode));
        when(userRepository.findByUserid("user1")).thenReturn(Optional.of(testUser));
        when(vipSwitchService.isSwitchEnabled("Double_points")).thenReturn(false);
        when(pointsService.formatTripDescription(anyString(), anyString(), anyDouble())).thenReturn("desc");
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));

        tripService.completeTrip("user1", "trip1", buildCompleteRequest());

        // totalCarbon was 50.0, now should be 50.0 + 2.5 / 10.0 = 50.25
        assertEquals(50.25, testUser.getTotalCarbon(), 0.01);
        verify(userRepository).save(testUser);
    }

    // ========== cancelTrip ==========

    @Test
    void cancelTrip_success() {
        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));

        tripService.cancelTrip("user1", "trip1");

        assertEquals("canceled", testTrip.getCarbonStatus());
        assertNotNull(testTrip.getEndTime());
        verify(tripRepository).save(testTrip);
    }

    @Test
    void cancelTrip_tripNotFound() {
        when(tripRepository.findById("nonexistent")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.cancelTrip("user1", "nonexistent"));
        assertEquals(ErrorCode.TRIP_NOT_FOUND.getCode(), ex.getCode());
    }

    @Test
    void cancelTrip_noPermission() {
        testTrip.setUserId("otherUser");
        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.cancelTrip("user1", "trip1"));
        assertEquals(ErrorCode.NO_PERMISSION.getCode(), ex.getCode());
    }

    @Test
    void cancelTrip_wrongStatus() {
        testTrip.setCarbonStatus("completed");
        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.cancelTrip("user1", "trip1"));
        assertEquals(ErrorCode.TRIP_STATUS_ERROR.getCode(), ex.getCode());
    }

    // ========== getTripById ==========

    @Test
    void getTripById_success() {
        testTrip.setDistance(2.5);
        testTrip.setCarbonSaved(0.5);
        testTrip.setPointsGained(50);
        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));

        TripDto.TripResponse result = tripService.getTripById("user1", "trip1");

        assertNotNull(result);
        assertEquals("trip1", result.id);
        assertEquals("user1", result.userId);
        assertEquals(2.5, result.distance);
    }

    @Test
    void getTripById_notFound() {
        when(tripRepository.findById("nonexistent")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.getTripById("user1", "nonexistent"));
        assertEquals(ErrorCode.TRIP_NOT_FOUND.getCode(), ex.getCode());
    }

    @Test
    void getTripById_noPermission() {
        testTrip.setUserId("otherUser");
        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> tripService.getTripById("user1", "trip1"));
        assertEquals(ErrorCode.NO_PERMISSION.getCode(), ex.getCode());
    }

    // ========== getUserTrips ==========

    @Test
    void getUserTrips_success() {
        Trip trip2 = new Trip();
        trip2.setId("trip2");
        trip2.setUserId("user1");
        trip2.setCarbonStatus("completed");
        trip2.setStartTime(LocalDateTime.now());

        when(tripRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of(testTrip, trip2));

        List<TripDto.TripSummaryResponse> result = tripService.getUserTrips("user1");

        assertEquals(2, result.size());
    }

    @Test
    void getUserTrips_empty() {
        when(tripRepository.findByUserIdOrderByCreatedAtDesc("user1")).thenReturn(List.of());

        List<TripDto.TripSummaryResponse> result = tripService.getUserTrips("user1");

        assertTrue(result.isEmpty());
    }

    // ========== getCurrentTrip ==========

    @Test
    void getCurrentTrip_exists() {
        when(tripRepository.findByUserIdAndCarbonStatus("user1", "tracking")).thenReturn(List.of(testTrip));

        TripDto.TripResponse result = tripService.getCurrentTrip("user1");

        assertNotNull(result);
        assertEquals("trip1", result.id);
    }

    @Test
    void getCurrentTrip_none() {
        when(tripRepository.findByUserIdAndCarbonStatus("user1", "tracking")).thenReturn(List.of());

        TripDto.TripResponse result = tripService.getCurrentTrip("user1");

        assertNull(result);
    }

    // ========== getAllTrips (admin) ==========

    @Test
    void getAllTrips_success() {
        Trip trip2 = new Trip();
        trip2.setId("trip2");
        trip2.setUserId("user2");
        trip2.setCarbonStatus("completed");

        org.bson.Document doc1 = new org.bson.Document();
        org.bson.Document doc2 = new org.bson.Document();
        when(mongoTemplate.findAll(org.bson.Document.class, "trips")).thenReturn(List.of(doc1, doc2));
        when(mongoTemplate.getConverter()).thenReturn(mongoConverter);
        when(mongoConverter.read(Trip.class, doc1)).thenReturn(testTrip);
        when(mongoConverter.read(Trip.class, doc2)).thenReturn(trip2);

        List<TripDto.TripSummaryResponse> result = tripService.getAllTrips();

        assertEquals(2, result.size());
    }

    @Test
    void getAllTrips_empty() {
        when(mongoTemplate.findAll(org.bson.Document.class, "trips")).thenReturn(List.of());

        List<TripDto.TripSummaryResponse> result = tripService.getAllTrips();

        assertTrue(result.isEmpty());
    }

    @Test
    void getAllTrips_dbException() {
        when(mongoTemplate.findAll(org.bson.Document.class, "trips")).thenThrow(new RuntimeException("DB error"));

        List<TripDto.TripSummaryResponse> result = tripService.getAllTrips();

        assertTrue(result.isEmpty());
    }

    // ========== getTripsByUser (admin) ==========

    @Test
    void getTripsByUser_success() {
        testTrip.setDistance(2.5);
        testTrip.setCarbonSaved(0.5);

        org.bson.Document doc1 = new org.bson.Document();
        when(mongoTemplate.find(any(org.springframework.data.mongodb.core.query.Query.class),
                eq(org.bson.Document.class), eq("trips"))).thenReturn(List.of(doc1));
        when(mongoTemplate.getConverter()).thenReturn(mongoConverter);
        when(mongoConverter.read(Trip.class, doc1)).thenReturn(testTrip);

        List<TripDto.TripResponse> result = tripService.getTripsByUser("user1");

        assertEquals(1, result.size());
        assertEquals("trip1", result.get(0).id);
    }

    @Test
    void getTripsByUser_empty() {
        when(mongoTemplate.find(any(org.springframework.data.mongodb.core.query.Query.class),
                eq(org.bson.Document.class), eq("trips"))).thenReturn(List.of());

        List<TripDto.TripResponse> result = tripService.getTripsByUser("userX");

        assertTrue(result.isEmpty());
    }

    @Test
    void getTripsByUser_dbException() {
        when(mongoTemplate.find(any(org.springframework.data.mongodb.core.query.Query.class),
                eq(org.bson.Document.class), eq("trips")))
                .thenThrow(new RuntimeException("DB error"));

        List<TripDto.TripResponse> result = tripService.getTripsByUser("user1");

        assertTrue(result.isEmpty());
    }

    // ========== convertToResponse (tested through getTripById) ==========

    @Test
    void getTripById_fullConversion() {
        testTrip.setDistance(3.0);
        testTrip.setCarbonSaved(0.6);
        testTrip.setPointsGained(60);
        testTrip.setDetectedMode("bike");
        testTrip.setMlConfidence(0.9);
        testTrip.setGreenTrip(true);
        testTrip.setEndPoint(new Trip.GeoPoint(116.1, 39.1));
        testTrip.setEndLocation(new Trip.LocationDetail("Address B", "Place B", "Zone B"));
        testTrip.setEndTime(LocalDateTime.now());

        Trip.TransportSegment seg = new Trip.TransportSegment("bike", 3.0, 15);
        testTrip.setTransportModes(List.of(seg));

        Trip.GeoPoint p1 = new Trip.GeoPoint(116.0, 39.0);
        Trip.GeoPoint p2 = new Trip.GeoPoint(116.05, 39.05);
        testTrip.setPolylinePoints(List.of(p1, p2));

        when(tripRepository.findById("trip1")).thenReturn(Optional.of(testTrip));

        TripDto.TripResponse result = tripService.getTripById("user1", "trip1");

        assertEquals("trip1", result.id);
        assertEquals("user1", result.userId);
        assertEquals(3.0, result.distance);
        assertEquals(0.6, result.carbonSaved);
        assertEquals(60, result.pointsGained);
        assertEquals("bike", result.detectedMode);
        assertEquals(0.9, result.mlConfidence, 0.01);
        assertTrue(result.isGreenTrip);
        assertNotNull(result.startPoint);
        assertNotNull(result.endPoint);
        assertNotNull(result.startLocation);
        assertNotNull(result.endLocation);
        assertEquals("Address B", result.endLocation.address);
        assertEquals(1, result.transportModes.size());
        assertEquals("bike", result.transportModes.get(0).mode);
        assertEquals(2, result.polylinePoints.size());
    }
}
