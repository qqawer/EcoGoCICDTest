package com.example.EcoGo.controller;

import com.example.EcoGo.dto.RecommendationRequestDto;
import com.example.EcoGo.dto.RecommendationResponseDto;
import com.example.EcoGo.dto.ResponseMessage;
import com.example.EcoGo.dto.chatbot.ChatResponseDto;
import com.example.EcoGo.service.chatbot.RagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.lang.reflect.Field;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecommendationControllerTest {

    private RagService ragService;
    private RecommendationController controller;

    @BeforeEach
    void setUp() throws Exception {
        ragService = mock(RagService.class);
        controller = new RecommendationController();

        Field f = RecommendationController.class.getDeclaredField("ragService");
        f.setAccessible(true);
        f.set(controller, ragService);
    }

    // ---------- RAG-based recommendation ----------
    @Test
    void recommend_ragAvailableWithCitations_shouldReturnRagBasedResponse() {
        when(ragService.isAvailable()).thenReturn(true);
        ChatResponseDto.Citation citation = new ChatResponseDto.Citation("Green Travel", "source1",
                "Take the MRT for low carbon travel.");
        when(ragService.retrieve(anyString(), eq(2))).thenReturn(List.of(citation));

        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination("Marina Bay");

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals(HttpStatus.OK.value(), resp.getCode());
        assertNotNull(resp.getData());
        assertEquals("Eco-RAG", resp.getData().getTag());
        assertTrue(resp.getData().getText().contains("Marina Bay"));
    }

    @Test
    void recommend_ragAvailableButNoCitations_shouldFallbackToGeneric() {
        when(ragService.isAvailable()).thenReturn(true);
        when(ragService.retrieve(anyString(), eq(2))).thenReturn(Collections.emptyList());

        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination("unknown_place_123");

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals(HttpStatus.OK.value(), resp.getCode());
        assertNotNull(resp.getData());
        assertEquals("Eco-Tip", resp.getData().getTag());
        assertTrue(resp.getData().getText().contains("unknown_place_123"));
    }

    @Test
    void recommend_ragThrowsException_shouldFallbackToGeneric() {
        when(ragService.isAvailable()).thenReturn(true);
        when(ragService.retrieve(anyString(), eq(2))).thenThrow(new RuntimeException("rag error"));

        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination("unknown_place_456");

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals(HttpStatus.OK.value(), resp.getCode());
        assertEquals("Eco-Tip", resp.getData().getTag());
    }

    // ---------- Keyword-based fallback tests adapted for Campus DB ----------
    @Test
    void recommend_library_shouldReturnCampusBus() {
        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination("library"); // Matches Central Library

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals("Campus-Bus", resp.getData().getTag());
        assertTrue(resp.getData().getText().contains("Central Library"));
    }

    @Test
    void recommend_gym_shouldReturnCampusBus() {
        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination("gym"); // Matches USC

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals("Campus-Bus", resp.getData().getTag());
        assertTrue(resp.getData().getText().contains("Sports Centre"));
    }

    @Test
    void recommend_lawCampus_shouldReturnGreenTransit() {
        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination("law"); // Matches offcampus

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals("Green-Transit", resp.getData().getTag());
    }

    @Test
    void recommend_emptyDestination_shouldReturnGeneral() {
        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination("");

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals("General", resp.getData().getTag());
    }

    @Test
    void recommend_nullDestination_shouldReturnGeneral() {
        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination(null);

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals("General", resp.getData().getTag());
    }

    @Test
    void recommend_unknownDestination_shouldReturnGeneric() {
        when(ragService.isAvailable()).thenReturn(false);

        RecommendationRequestDto req = new RecommendationRequestDto();
        req.setDestination("zxcvbnm");

        ResponseMessage<RecommendationResponseDto> resp = controller.recommend(req);

        assertEquals("Eco-Tip", resp.getData().getTag());
        assertTrue(resp.getData().getText().contains("zxcvbnm"));
    }
}
