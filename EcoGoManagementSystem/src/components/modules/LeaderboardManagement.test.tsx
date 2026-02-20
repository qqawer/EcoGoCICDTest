import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { LeaderboardManagement, computeNewDate } from './LeaderboardManagement';
import * as leaderboardApi from '@/api/leaderboardApi';

// Mock API
vi.mock('@/api/leaderboardApi', () => ({
    getRankingsByType: vi.fn(),
    getFacultyRankings: vi.fn(),
}));

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
};

describe('LeaderboardManagement', () => {
    const mockRankings = {
        rankingsPage: {
            content: [
                { userId: 'u1', nickname: 'Alice', rank: 1, carbonSaved: 100, rewardPoints: 50, isVip: true },
                { userId: 'u2', nickname: 'Bob', rank: 2, carbonSaved: 90, rewardPoints: 40, isVip: false },
                { userId: 'u3', nickname: 'Charlie', rank: 3, carbonSaved: 80, rewardPoints: 30, isVip: false },
                { userId: 'u4', nickname: 'Dave', rank: 4, carbonSaved: 70, rewardPoints: 20, isVip: false },
            ],
            totalPages: 2,
            totalElements: 14,
            number: 0
        },
        totalCarbonSaved: 1000,
        totalRewardsDistributed: 500,
        totalVipUsers: 5
    };

    const mockFacultyData = [
        { faculty: 'Engineering', totalCarbon: 500, rank: 1 },
        { faculty: 'Science', totalCarbon: 300, rank: 2 }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(leaderboardApi.getRankingsByType).mockResolvedValue(mockRankings as any);
        vi.mocked(leaderboardApi.getFacultyRankings).mockResolvedValue(mockFacultyData as any);
    });

    describe('Helper Functions', () => {
        describe('computeNewDate', () => {
            it('should calculate daily dates correctly', () => {
                expect(computeNewDate('2025-01-01', 1, 'DAILY')).toBe('2025-01-02');
                expect(computeNewDate('2025-01-01', -1, 'DAILY')).toBe('2024-12-31');
            });

            it('should calculate monthly dates correctly', () => {
                expect(computeNewDate('2025-01', 1, 'MONTHLY')).toBe('2025-02');
                expect(computeNewDate('2025-01', -1, 'MONTHLY')).toBe('2024-12');
            });
        });
    });

    describe('Component Logic', () => {
        it('renders loading state initially', () => {
            vi.mocked(leaderboardApi.getRankingsByType).mockImplementation(() => new Promise(() => { }));
            render(<LeaderboardManagement />);
            expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();
            // Clean up mock
            vi.mocked(leaderboardApi.getRankingsByType).mockResolvedValue(mockRankings as any);
        });

        it('renders empty state when no data', async () => {
            vi.mocked(leaderboardApi.getRankingsByType).mockResolvedValue({
                rankingsPage: { content: [], totalPages: 0, totalElements: 0, number: 0 },
                totalCarbonSaved: 0, totalRewardsDistributed: 0, totalVipUsers: 0
            } as any);

            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('No rankings found')).toBeInTheDocument());
            expect(screen.getByText('No completed trips for this period.')).toBeInTheDocument();
        });

        it('handles API errors gracefully', async () => {
            vi.mocked(leaderboardApi.getRankingsByType).mockRejectedValue(new Error('Network fail'));
            render(<LeaderboardManagement />);

            await waitFor(() => expect(screen.getByText('Network fail')).toBeInTheDocument());
        });

        it('renders individual rankings with correct badges', async () => {
            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
            expect(screen.getByText('#4')).toBeInTheDocument();
        });

        it('navigates dates', async () => {
            const user = userEvent.setup();
            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

            const todayLabel = new Date().toISOString().split('T')[0];
            const dateLabel = screen.getByText(todayLabel);

            const buttons = screen.getAllByRole('button');
            const iconButtons = buttons.filter(b => !b.textContent);
            const prevDateBtn = iconButtons[0];

            await user.click(prevDateBtn);

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const expectedDate = yesterday.toISOString().split('T')[0];

            await waitFor(() => {
                expect(leaderboardApi.getRankingsByType).toHaveBeenCalledWith(
                    expect.any(String),
                    expectedDate,
                    expect.any(String),
                    expect.any(Number),
                    expect.any(Number)
                );
            });

            // Navigate Next (Now accessible)
            const nextDateBtn = iconButtons[1];
            await user.click(nextDateBtn);

            const today = new Date().toISOString().split('T')[0];
            await waitFor(() => {
                expect(leaderboardApi.getRankingsByType).toHaveBeenCalledWith(
                    expect.any(String),
                    today,
                    expect.any(String),
                    expect.any(Number),
                    expect.any(Number)
                );
            });
        });

        it('toggles leaderboard type', async () => {
            const user = userEvent.setup();
            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

            const monthlyBtn = screen.getByRole('button', { name: /Monthly/i });
            await user.click(monthlyBtn);

            await waitFor(() => {
                expect(leaderboardApi.getRankingsByType).toHaveBeenCalledWith('MONTHLY', expect.any(String), expect.any(String), 0, 10);
            });
        });

        it('toggles leaderboard type back and forth', async () => {
            const user = userEvent.setup();
            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

            const monthlyBtn = screen.getByRole('button', { name: /Monthly/i });
            await user.click(monthlyBtn);
            await waitFor(() => expect(leaderboardApi.getRankingsByType).toHaveBeenCalledWith('MONTHLY', expect.any(String), expect.any(String), 0, 10));

            const dailyBtn = screen.getByRole('button', { name: /Daily/i });
            await user.click(dailyBtn);
            await waitFor(() => expect(leaderboardApi.getRankingsByType).toHaveBeenCalledWith('DAILY', expect.any(String), expect.any(String), 0, 10));
        });

        it('toggles view mode back and forth and handles errors', async () => {
            const user = userEvent.setup();
            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

            // Switch to Faculty
            await user.click(screen.getByRole('button', { name: /Faculty/i }));

            await waitFor(() => expect(leaderboardApi.getFacultyRankings).toHaveBeenCalled());
            expect(screen.getByText('Engineering')).toBeInTheDocument();

            // Back to Individual
            await user.click(screen.getByRole('button', { name: /Individual/i }));
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

            // Test Faculty Error
            vi.mocked(leaderboardApi.getFacultyRankings).mockRejectedValue(new Error('Faculty Fail'));
            await user.click(screen.getByRole('button', { name: /Faculty/i }));
            await waitFor(() => expect(screen.getByText('Faculty Fail')).toBeInTheDocument());
        });

        it('shows loader when refreshing empty state', async () => {
            const user = userEvent.setup();
            // 1. Load empty
            vi.mocked(leaderboardApi.getRankingsByType).mockResolvedValue({
                rankingsPage: { content: [], totalPages: 0, totalElements: 0, number: 0 },
                totalCarbonSaved: 0, totalRewardsDistributed: 0, totalVipUsers: 0
            } as any);

            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('No rankings found')).toBeInTheDocument());

            // 2. Refresh with delay
            let resolveRefresh: (value?: unknown) => void;
            const refreshPromise = new Promise(r => resolveRefresh = r);
            vi.mocked(leaderboardApi.getRankingsByType).mockReturnValue(refreshPromise as any);

            await user.click(screen.getByRole('button', { name: /Refresh/i }));

            // Assert Loader is visible (No rankings found should be gone)
            expect(screen.queryByText('No rankings found')).not.toBeInTheDocument();

            // Resolve
            resolveRefresh!({
                rankingsPage: { content: [], totalPages: 0, totalElements: 0, number: 0 },
                totalCarbonSaved: 0, totalRewardsDistributed: 0, totalVipUsers: 0
            });
            await waitFor(() => expect(screen.getByText('No rankings found')).toBeInTheDocument());
        });

        it('handles faculty view and empty state', async () => {
            const user = userEvent.setup();
            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

            // Switch to Faculty
            await user.click(screen.getByRole('button', { name: /Faculty/i }));

            await waitFor(() => expect(leaderboardApi.getFacultyRankings).toHaveBeenCalled());
            expect(screen.getByText('Engineering')).toBeInTheDocument();

            // Test empty faculty
            vi.mocked(leaderboardApi.getFacultyRankings).mockResolvedValue([]);
            const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
            await user.click(refreshBtn);

            await waitFor(() => expect(screen.getByText('No faculty data found')).toBeInTheDocument());
        });

        it('pagination calls API with new page', async () => {
            const user = userEvent.setup();
            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

            // Pagination "Next"
            const nextBtn = screen.getByRole('button', { name: /Next/i });
            await user.click(nextBtn);

            await waitFor(() => expect(leaderboardApi.getRankingsByType).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(String), 1, 10));

            // Pagination "Previous"
            const prevBtn = screen.getByRole('button', { name: /Previous/i });
            await user.click(prevBtn);

            await waitFor(() => expect(leaderboardApi.getRankingsByType).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(String), 0, 10));
        });

        it('search filters triggered', async () => {
            const user = userEvent.setup();
            render(<LeaderboardManagement />);
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

            const searchInput = screen.getByPlaceholderText('Search by nickname...');
            await user.type(searchInput, 'Bob');

            // Debounce 300ms
            await waitFor(() => expect(leaderboardApi.getRankingsByType).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'Bob', 0, 10), { timeout: 1000 });
        });
    });
});
