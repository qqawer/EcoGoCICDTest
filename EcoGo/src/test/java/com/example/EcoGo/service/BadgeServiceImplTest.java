package com.example.EcoGo.service;

import com.example.EcoGo.dto.BadgePurchaseStatDto;
import com.example.EcoGo.dto.PointsDto;
import com.example.EcoGo.interfacemethods.BadgeService;
import com.example.EcoGo.interfacemethods.PointsService;
import com.example.EcoGo.model.Badge;
import com.example.EcoGo.model.User;
import com.example.EcoGo.model.UserBadge;
import com.example.EcoGo.repository.BadgeRepository;
import com.example.EcoGo.repository.UserBadgeRepository;
import com.example.EcoGo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BadgeServiceImplTest {

    @Mock
    private BadgeRepository badgeRepository;
    @Mock
    private UserBadgeRepository userBadgeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PointsService pointsService;
    @Mock
    private BadgeService self;

    @InjectMocks
    private BadgeServiceImpl badgeService;

    private Badge testBadge;
    private UserBadge testUserBadge;
    private User testUser;

    @BeforeEach
    void setUp() {
        testBadge = new Badge();
        testBadge.setBadgeId("badge1");
        testBadge.setName(Map.of("en", "Green Walker"));
        testBadge.setCategory("RANK");
        testBadge.setSubCategory("eco");
        testBadge.setPurchaseCost(100);
        testBadge.setIsActive(true);
        testBadge.setAcquisitionMethod("purchase");
        testBadge.setCreatedAt(new Date());

        testUserBadge = new UserBadge();
        testUserBadge.setUserId("user1");
        testUserBadge.setBadgeId("badge1");
        testUserBadge.setDisplay(false);
        testUserBadge.setUnlockedAt(new Date());
        testUserBadge.setCreatedAt(new Date());
        testUserBadge.setCategory("RANK");

        testUser = new User();
        testUser.setUserid("user1");
        testUser.setCurrentPoints(500);
        testUser.setTotalCarbon(100.0);
    }

    // ========== purchaseBadge ==========

    @Test
    void purchaseBadge_success() {
        when(userBadgeRepository.existsByUserIdAndBadgeId("user1", "badge1")).thenReturn(false);
        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));
        when(pointsService.formatBadgeDescription("Green Walker")).thenReturn("Purchased Badge: Green Walker");
        when(userBadgeRepository.save(any(UserBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        UserBadge result = badgeService.purchaseBadge("user1", "badge1");

        assertNotNull(result);
        assertEquals("user1", result.getUserId());
        assertEquals("badge1", result.getBadgeId());
        assertFalse(result.isDisplay());
        verify(pointsService).settle(eq("user1"), any(PointsDto.SettleResult.class));
    }

    @Test
    void purchaseBadge_alreadyOwned() {
        when(userBadgeRepository.existsByUserIdAndBadgeId("user1", "badge1")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.purchaseBadge("user1", "badge1"));
        assertEquals("您已拥有该徽章", ex.getMessage());
    }

    @Test
    void purchaseBadge_badgeNotFound() {
        when(userBadgeRepository.existsByUserIdAndBadgeId("user1", "nonexistent")).thenReturn(false);
        when(badgeRepository.findByBadgeId("nonexistent")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.purchaseBadge("user1", "nonexistent"));
        assertEquals("商品不存在", ex.getMessage());
    }

    @Test
    void purchaseBadge_notPurchaseMethod() {
        testBadge.setAcquisitionMethod("achievement");
        when(userBadgeRepository.existsByUserIdAndBadgeId("user1", "badge1")).thenReturn(false);
        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.purchaseBadge("user1", "badge1"));
        assertEquals("该徽章不可通过购买获得", ex.getMessage());
    }

    @Test
    void purchaseBadge_zeroCost() {
        testBadge.setPurchaseCost(0);
        when(userBadgeRepository.existsByUserIdAndBadgeId("user1", "badge1")).thenReturn(false);
        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.purchaseBadge("user1", "badge1"));
        assertEquals("该徽章不可购买", ex.getMessage());
    }

    @Test
    void purchaseBadge_nullCost() {
        testBadge.setPurchaseCost(null);
        when(userBadgeRepository.existsByUserIdAndBadgeId("user1", "badge1")).thenReturn(false);
        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.purchaseBadge("user1", "badge1"));
        assertEquals("该徽章不可购买", ex.getMessage());
    }

    // ========== toggleBadgeDisplay ==========

    @Test
    void toggleBadgeDisplay_unequip() {
        when(userBadgeRepository.findByUserIdAndBadgeId("user1", "badge1"))
                .thenReturn(Optional.of(testUserBadge));
        when(userBadgeRepository.save(any(UserBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        UserBadge result = badgeService.toggleBadgeDisplay("user1", "badge1", false);

        assertFalse(result.isDisplay());
        verify(badgeRepository, never()).findByBadgeId(anyString());
    }

    @Test
    void toggleBadgeDisplay_equipWithMutualExclusion() {
        // Set up: user already has another RANK badge displayed
        UserBadge conflictBadge = new UserBadge();
        conflictBadge.setUserId("user1");
        conflictBadge.setBadgeId("badge2");
        conflictBadge.setDisplay(true);

        Badge anotherRankBadge = new Badge();
        anotherRankBadge.setBadgeId("badge2");
        anotherRankBadge.setCategory("RANK");
        anotherRankBadge.setSubCategory("eco");

        when(userBadgeRepository.findByUserIdAndBadgeId("user1", "badge1"))
                .thenReturn(Optional.of(testUserBadge));
        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));
        when(badgeRepository.findBySubCategory("eco")).thenReturn(List.of(testBadge, anotherRankBadge));
        when(userBadgeRepository.findByUserIdAndIsDisplayTrueAndBadgeIdIn(eq("user1"), anyList()))
                .thenReturn(List.of(conflictBadge));
        when(userBadgeRepository.save(any(UserBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        UserBadge result = badgeService.toggleBadgeDisplay("user1", "badge1", true);

        assertTrue(result.isDisplay());
        // Verify the conflicting badge was unequipped
        assertFalse(conflictBadge.isDisplay());
        // save called for: conflict badge unequip + target badge equip = 2 times
        verify(userBadgeRepository, times(2)).save(any(UserBadge.class));
    }

    @Test
    void toggleBadgeDisplay_equipNoCategoryConflict() {
        testBadge.setCategory("SPECIAL");
        testBadge.setSubCategory("special_sub");

        when(userBadgeRepository.findByUserIdAndBadgeId("user1", "badge1"))
                .thenReturn(Optional.of(testUserBadge));
        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));
        when(badgeRepository.findBySubCategory("special_sub")).thenReturn(List.of(testBadge));
        when(userBadgeRepository.findByUserIdAndIsDisplayTrueAndBadgeIdIn(eq("user1"), anyList()))
                .thenReturn(List.of());
        when(userBadgeRepository.save(any(UserBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        UserBadge result = badgeService.toggleBadgeDisplay("user1", "badge1", true);

        assertTrue(result.isDisplay());
        verify(userBadgeRepository, times(1)).save(any(UserBadge.class));
    }

    @Test
    void toggleBadgeDisplay_notOwned() {
        when(userBadgeRepository.findByUserIdAndBadgeId("user1", "badge1"))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.toggleBadgeDisplay("user1", "badge1", true));
        assertEquals("您还没有获得这个徽章", ex.getMessage());
    }

    @Test
    void toggleBadgeDisplay_badgeDefNotFound() {
        when(userBadgeRepository.findByUserIdAndBadgeId("user1", "badge1"))
                .thenReturn(Optional.of(testUserBadge));
        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.toggleBadgeDisplay("user1", "badge1", true));
        assertEquals("徽章定义不存在", ex.getMessage());
    }

    // ========== getShopList ==========

    @Test
    void getShopList_success() {
        when(badgeRepository.findByIsActive(true)).thenReturn(List.of(testBadge));

        List<Badge> result = badgeService.getShopList();

        assertEquals(1, result.size());
        assertEquals("badge1", result.get(0).getBadgeId());
    }

    @Test
    void getShopList_empty() {
        when(badgeRepository.findByIsActive(true)).thenReturn(List.of());

        List<Badge> result = badgeService.getShopList();

        assertTrue(result.isEmpty());
    }

    // ========== getMyBadges ==========

    @Test
    void getMyBadges_success() {
        when(self.checkAndUnlockCarbonBadges("user1")).thenReturn(List.of());
        when(userBadgeRepository.findByUserId("user1")).thenReturn(List.of(testUserBadge));

        List<UserBadge> result = badgeService.getMyBadges("user1");

        assertEquals(1, result.size());
        assertEquals("badge1", result.get(0).getBadgeId());
        verify(self).checkAndUnlockCarbonBadges("user1");
    }

    // ========== createBadge ==========

    @Test
    void createBadge_success() {
        when(badgeRepository.save(testBadge)).thenReturn(testBadge);

        Badge result = badgeService.createBadge(testBadge);

        assertNotNull(result);
        assertEquals("badge1", result.getBadgeId());
        verify(badgeRepository).save(testBadge);
    }

    // ========== updateBadge ==========

    @Test
    void updateBadge_success() {
        Badge updatedBadge = new Badge();
        updatedBadge.setName(Map.of("en", "Updated Name"));
        updatedBadge.setPurchaseCost(200);

        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));
        when(badgeRepository.save(any(Badge.class))).thenAnswer(inv -> inv.getArgument(0));

        Badge result = badgeService.updateBadge("badge1", updatedBadge);

        assertEquals("Updated Name", result.getName().get("en"));
        assertEquals(200, result.getPurchaseCost());
    }

    @Test
    void updateBadge_partialUpdate() {
        Badge updatedBadge = new Badge();
        updatedBadge.setPurchaseCost(300);
        // name is null, should not be updated

        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));
        when(badgeRepository.save(any(Badge.class))).thenAnswer(inv -> inv.getArgument(0));

        Badge result = badgeService.updateBadge("badge1", updatedBadge);

        assertEquals("Green Walker", result.getName().get("en")); // unchanged
        assertEquals(300, result.getPurchaseCost()); // updated
    }

    @Test
    void updateBadge_notFound() {
        when(badgeRepository.findByBadgeId("nonexistent")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.updateBadge("nonexistent", new Badge()));
        assertEquals("徽章不存在", ex.getMessage());
    }

    // ========== deleteBadge ==========

    @Test
    void deleteBadge_success() {
        when(badgeRepository.findByBadgeId("badge1")).thenReturn(Optional.of(testBadge));
        doNothing().when(badgeRepository).delete(testBadge);

        badgeService.deleteBadge("badge1");

        verify(badgeRepository).delete(testBadge);
    }

    @Test
    void deleteBadge_notFound() {
        when(badgeRepository.findByBadgeId("nonexistent")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.deleteBadge("nonexistent"));
        assertEquals("徽章不存在", ex.getMessage());
    }

    // ========== getAllBadges ==========

    @Test
    void getAllBadges_noFilter() {
        when(badgeRepository.findAll()).thenReturn(List.of(testBadge));

        List<Badge> result = badgeService.getAllBadges(null);

        assertEquals(1, result.size());
        verify(badgeRepository).findAll();
        verify(badgeRepository, never()).findByCategory(anyString());
    }

    @Test
    void getAllBadges_emptyFilter() {
        when(badgeRepository.findAll()).thenReturn(List.of(testBadge));

        List<Badge> result = badgeService.getAllBadges("");

        assertEquals(1, result.size());
        verify(badgeRepository).findAll();
    }

    @Test
    void getAllBadges_withCategory() {
        when(badgeRepository.findByCategory("RANK")).thenReturn(List.of(testBadge));

        List<Badge> result = badgeService.getAllBadges("RANK");

        assertEquals(1, result.size());
        verify(badgeRepository).findByCategory("RANK");
        verify(badgeRepository, never()).findAll();
    }

    // ========== getBadgesBySubCategory ==========

    @Test
    void getBadgesBySubCategory_success() {
        when(badgeRepository.findBySubCategory("eco")).thenReturn(List.of(testBadge));

        List<Badge> result = badgeService.getBadgesBySubCategory("eco");

        assertEquals(1, result.size());
    }

    @Test
    void getBadgesBySubCategory_empty() {
        when(badgeRepository.findBySubCategory("none")).thenReturn(List.of());

        List<Badge> result = badgeService.getBadgesBySubCategory("none");

        assertTrue(result.isEmpty());
    }

    // ========== getBadgesByAcquisitionMethod ==========

    @Test
    void getBadgesByAcquisitionMethod_success() {
        when(badgeRepository.findByAcquisitionMethod("purchase")).thenReturn(List.of(testBadge));

        List<Badge> result = badgeService.getBadgesByAcquisitionMethod("purchase");

        assertEquals(1, result.size());
    }

    // ========== getBadgePurchaseStats ==========

    @Test
    void getBadgePurchaseStats_success() {
        BadgePurchaseStatDto stat = new BadgePurchaseStatDto();
        stat.setBadgeId("badge1");
        stat.setPurchaseCount(10);
        when(userBadgeRepository.countPurchasesByBadge()).thenReturn(List.of(stat));

        List<BadgePurchaseStatDto> result = badgeService.getBadgePurchaseStats();

        assertEquals(1, result.size());
        assertEquals("badge1", result.get(0).getBadgeId());
        assertEquals(10, result.get(0).getPurchaseCount());
    }

    // ========== checkAndUnlockCarbonBadges ==========

    @Test
    void checkAndUnlockCarbonBadges_unlocksNewBadge() {
        Badge achievementBadge = new Badge();
        achievementBadge.setBadgeId("carbon_50");
        achievementBadge.setCategory("ACHIEVEMENT");
        achievementBadge.setSubCategory("carbon");
        achievementBadge.setAcquisitionMethod("achievement");
        achievementBadge.setCarbonThreshold(50.0);

        when(userRepository.findByUserid("user1")).thenReturn(Optional.of(testUser)); // totalCarbon = 100.0
        when(badgeRepository.findByIsActiveTrueAndAcquisitionMethodAndCarbonThresholdLessThanEqual("achievement",
                100.0))
                .thenReturn(List.of(achievementBadge));
        when(userBadgeRepository.findByUserId("user1")).thenReturn(List.of()); // no existing badges
        when(userBadgeRepository.save(any(UserBadge.class))).thenAnswer(inv -> inv.getArgument(0));

        List<UserBadge> result = badgeService.checkAndUnlockCarbonBadges("user1");

        assertEquals(1, result.size());
        assertEquals("carbon_50", result.get(0).getBadgeId());
        assertEquals("user1", result.get(0).getUserId());
    }

    @Test
    void checkAndUnlockCarbonBadges_alreadyOwned() {
        Badge achievementBadge = new Badge();
        achievementBadge.setBadgeId("carbon_50");
        achievementBadge.setAcquisitionMethod("achievement");
        achievementBadge.setCarbonThreshold(50.0);

        UserBadge existingBadge = new UserBadge();
        existingBadge.setUserId("user1");
        existingBadge.setBadgeId("carbon_50");

        when(userRepository.findByUserid("user1")).thenReturn(Optional.of(testUser));
        when(badgeRepository.findByIsActiveTrueAndAcquisitionMethodAndCarbonThresholdLessThanEqual("achievement",
                100.0))
                .thenReturn(List.of(achievementBadge));
        when(userBadgeRepository.findByUserId("user1")).thenReturn(List.of(existingBadge));

        List<UserBadge> result = badgeService.checkAndUnlockCarbonBadges("user1");

        assertTrue(result.isEmpty());
        verify(userBadgeRepository, never()).save(any(UserBadge.class));
    }

    @Test
    void checkAndUnlockCarbonBadges_noQualifiedBadges() {
        when(userRepository.findByUserid("user1")).thenReturn(Optional.of(testUser));
        when(badgeRepository.findByIsActiveTrueAndAcquisitionMethodAndCarbonThresholdLessThanEqual("achievement",
                100.0))
                .thenReturn(List.of());

        List<UserBadge> result = badgeService.checkAndUnlockCarbonBadges("user1");

        assertTrue(result.isEmpty());
    }

    @Test
    void checkAndUnlockCarbonBadges_userNotFound() {
        when(userRepository.findByUserid("nonexistent")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> badgeService.checkAndUnlockCarbonBadges("nonexistent"));
        assertEquals("用户不存在", ex.getMessage());
    }
}
