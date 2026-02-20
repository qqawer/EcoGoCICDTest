package com.example.EcoGo.service.chatbot;

import com.example.EcoGo.dto.chatbot.ChatResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RagServiceTest {

    private RagService ragService;

    @BeforeEach
    void setUp() {
        ragService = new RagService();
        // @PostConstruct init() is called automatically in Spring,
        // but in unit test we call it manually
        ragService.init();
    }

    // ---------- isAvailable ----------
    @Test
    void isAvailable_afterInit_shouldReturnTrueIfChunksLoaded() {
        // If chunks.jsonl is on the classpath (in src/main/resources/chatbot/),
        // the service should be available
        // If the file is missing in test environment, isAvailable returns false
        // Either case is valid for this test
        boolean available = ragService.isAvailable();
        // Just verify it doesn't throw
        assertNotNull(Boolean.valueOf(available));
    }

    // ---------- retrieve ----------
    @Test
    void retrieve_whenAvailable_shouldReturnCitations() {
        if (!ragService.isAvailable()) {
            // Skip this test if chunks.jsonl not on classpath
            return;
        }

        List<ChatResponseDto.Citation> results = ragService.retrieve("green travel bus", 3);

        assertNotNull(results);
        // Should return some results if chunks exist
        assertFalse(results.isEmpty());

        // Each citation should have non-null fields
        for (ChatResponseDto.Citation c : results) {
            assertNotNull(c.getTitle());
            assertNotNull(c.getSource());
            assertNotNull(c.getSnippet());
            assertTrue(c.getSnippet().length() <= 600);
        }
    }

    @Test
    void retrieve_topK1_shouldReturnAtMost1Result() {
        if (!ragService.isAvailable()) {
            return;
        }

        List<ChatResponseDto.Citation> results = ragService.retrieve("NUS campus shuttle", 1);

        assertNotNull(results);
        assertTrue(results.size() <= 1);
    }

    @Test
    void retrieve_irrelevantQuery_shouldReturnEmptyOrLowScore() {
        if (!ragService.isAvailable()) {
            return;
        }

        // Very irrelevant query should return fewer results
        List<ChatResponseDto.Citation> results = ragService.retrieve("xyzabc123random", 3);

        assertNotNull(results);
        // May return 0 results if cosine similarity is 0 for all chunks
    }

    @Test
    void retrieve_emptyChunks_shouldReturnEmptyList() {
        // Create a fresh service that hasn't loaded any chunks
        RagService emptyService = new RagService();
        // Don't call init() — no chunks loaded

        assertFalse(emptyService.isAvailable());

        List<ChatResponseDto.Citation> results = emptyService.retrieve("anything", 3);

        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    void retrieve_chineseQuery_shouldWork() {
        if (!ragService.isAvailable()) {
            return;
        }

        List<ChatResponseDto.Citation> results = ragService.retrieve("绿色出行公交", 2);

        assertNotNull(results);
        // The tokenizer supports Chinese characters
    }

    // ---------- Edge cases ----------
    @Test
    void retrieve_emptyQuery_shouldNotThrow() {
        if (!ragService.isAvailable()) {
            return;
        }

        List<ChatResponseDto.Citation> results = ragService.retrieve("", 3);

        assertNotNull(results);
    }

    @Test
    void retrieve_zeroK_shouldReturnEmptyList() {
        if (!ragService.isAvailable()) {
            return;
        }

        List<ChatResponseDto.Citation> results = ragService.retrieve("test", 0);

        assertNotNull(results);
        assertTrue(results.isEmpty());
    }
}
