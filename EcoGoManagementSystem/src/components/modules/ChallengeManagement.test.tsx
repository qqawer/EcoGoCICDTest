import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { ChallengeManagement } from './ChallengeManagement';
import { challengeApi } from '@/api/challengeApi';

// Mock API
vi.mock('@/api/challengeApi', () => ({
    challengeApi: {
        getAllChallenges: vi.fn(),
        createChallenge: vi.fn(),
        updateChallenge: vi.fn(),
        deleteChallenge: vi.fn(),
        getChallengeParticipants: vi.fn(),
    },
}));

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
};

describe('ChallengeManagement', () => {
    const mockChallenges = [
        {
            id: '1', title: 'Active Challenge', description: 'Desc 1', type: 'GREEN_TRIPS_DISTANCE',
            target: 10, reward: 100, badge: 'badge1', icon: '🏃', status: 'ACTIVE', participants: 5,
            startTime: '2023-01-01T00:00:00Z', endTime: '2023-01-07T00:00:00Z'
        },
        {
            id: '2', title: 'Completed Challenge', description: 'Desc 2', type: 'CARBON_SAVED',
            target: 5, reward: 200, badge: 'badge2', icon: '🌱', status: 'COMPLETED', participants: 10,
            startTime: '2022-01-01T00:00:00Z', endTime: '2022-01-07T00:00:00Z'
        },
        {
            id: '3', title: 'Expired Challenge', description: 'Desc 3', type: 'GREEN_TRIPS_COUNT',
            target: 5, reward: 200, badge: 'badge3', icon: '💀', status: 'EXPIRED', participants: 0,
            startTime: '2022-01-01T00:00:00Z', endTime: '2022-01-07T00:00:00Z'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(challengeApi.getAllChallenges).mockResolvedValue(mockChallenges as any);
        // Default success responses
        vi.mocked(challengeApi.createChallenge).mockImplementation((data) => Promise.resolve({ ...data, id: 'new' } as any));
        vi.mocked(challengeApi.updateChallenge).mockImplementation((id, data) => Promise.resolve({ ...data, id } as any));
        vi.mocked(challengeApi.deleteChallenge).mockResolvedValue({} as any);
        vi.mocked(challengeApi.getChallengeParticipants).mockResolvedValue([]);

        // Mock confirm
        globalThis.confirm = vi.fn(() => true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders and displays different statuses correctly', async () => {
        render(<ChallengeManagement />);
        await waitFor(() => expect(screen.getByText('Active Challenge')).toBeInTheDocument());

        // Active
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
        // Completed
        expect(screen.getByText('COMPLETED')).toBeInTheDocument();
        // Expired
        expect(screen.getByText('EXPIRED')).toBeInTheDocument();
    });

    it('handles fetch error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(challengeApi.getAllChallenges).mockRejectedValue(new Error('Fetch Fail'));

        render(<ChallengeManagement />);
        await waitFor(() => expect(challengeApi.getAllChallenges).toHaveBeenCalled());

        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch challenges:', expect.any(Error));
    });

    it('creates a new challenge with detailed values', async () => {
        const user = userEvent.setup();
        render(<ChallengeManagement />);
        await waitFor(() => expect(screen.getByText('Create Challenge')).toBeInTheDocument());
        await user.click(screen.getByText('Create Challenge'));

        // Fill form
        const titleInput = screen.getByPlaceholderText('Enter challenge title...');
        await user.clear(titleInput);
        await user.type(titleInput, 'Detail Challenge');

        const iconInput = screen.getByPlaceholderText('🎯');
        await user.clear(iconInput);
        await user.type(iconInput, '🚀');

        const descInput = screen.getByPlaceholderText('Enter challenge description...');
        await user.clear(descInput);
        await user.type(descInput, 'Description');

        // Target (Default 10)
        const targetInput = screen.getByDisplayValue('10');
        await user.clear(targetInput);
        await user.type(targetInput, '99');

        // Reward (Default 100)
        const rewardInput = screen.getByDisplayValue('100');
        await user.clear(rewardInput);
        await user.type(rewardInput, '999');

        await user.click(screen.getByRole('button', { name: 'Create Challenge' }));

        await waitFor(() => expect(challengeApi.createChallenge).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Detail Challenge',
            target: 99,
            reward: 999
        })), { timeout: 3000 });
    });

    it('handles create error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(challengeApi.createChallenge).mockRejectedValue(new Error('Create Fail'));
        const user = userEvent.setup();
        render(<ChallengeManagement />);

        await user.click(await screen.findByText('Create Challenge'));
        await user.click(screen.getByRole('button', { name: 'Create Challenge' })); // Submit empty/default

        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Failed to create challenge:', expect.any(Error)));
    });

    it('edits a challenge details', async () => {
        const user = userEvent.setup();
        render(<ChallengeManagement />);
        await waitFor(() => expect(screen.getByText('Active Challenge')).toBeInTheDocument());

        // Click Edit on first row
        const rows = screen.getAllByRole('row');
        const firstRow = rows[1];
        const editBtn = within(firstRow).getAllByRole('button')[1];
        await user.click(editBtn);

        expect(screen.getByText('Edit Challenge')).toBeInTheDocument();

        // Change title
        const titleInput = screen.getByDisplayValue('Active Challenge');
        await user.clear(titleInput);
        await user.type(titleInput, 'Updated Title');

        // Change Target (It was 10 in mock)
        const targetInput = screen.getByDisplayValue('10');
        await user.clear(targetInput);
        await user.type(targetInput, '20');

        await user.click(screen.getByRole('button', { name: 'Save Changes' }));

        await waitFor(() => expect(challengeApi.updateChallenge).toHaveBeenCalledWith('1', expect.objectContaining({
            title: 'Updated Title',
            target: 20
        })), { timeout: 3000 });
    });

    it('handles update error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(challengeApi.updateChallenge).mockRejectedValue(new Error('Update Fail'));
        const user = userEvent.setup();
        render(<ChallengeManagement />);
        await waitFor(() => expect(screen.getByText('Active Challenge')).toBeInTheDocument());

        const editBtn = within(screen.getAllByRole('row')[1]).getAllByRole('button')[1];
        await user.click(editBtn);
        await user.click(screen.getByRole('button', { name: 'Save Changes' }));

        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Failed to update challenge:', expect.any(Error)));
    });

    it('deletes a challenge', async () => {
        const user = userEvent.setup();
        render(<ChallengeManagement />);
        await waitFor(() => expect(screen.getByText('Active Challenge')).toBeInTheDocument());

        const deleteBtn = within(screen.getAllByRole('row')[1]).getAllByRole('button')[2];
        await user.click(deleteBtn);

        expect(globalThis.confirm).toHaveBeenCalled();
        await waitFor(() => expect(challengeApi.deleteChallenge).toHaveBeenCalledWith('1'));
    });

    it('handles delete error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(challengeApi.deleteChallenge).mockRejectedValue(new Error('Delete Fail'));
        const user = userEvent.setup();
        render(<ChallengeManagement />);
        await waitFor(() => expect(screen.getByText('Active Challenge')).toBeInTheDocument());

        const deleteBtn = within(screen.getAllByRole('row')[1]).getAllByRole('button')[2];
        await user.click(deleteBtn);

        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Failed to delete challenge:', expect.any(Error)));
    });

    it('views participants and handles error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(challengeApi.getChallengeParticipants).mockRejectedValue(new Error('Participants Fail'));
        const user = userEvent.setup();
        render(<ChallengeManagement />);
        await waitFor(() => expect(screen.getByText('Active Challenge')).toBeInTheDocument());

        const viewBtn = within(screen.getAllByRole('row')[1]).getAllByRole('button')[0];
        await user.click(viewBtn);

        await waitFor(() => expect(challengeApi.getChallengeParticipants).toHaveBeenCalled());
        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch participants:', expect.any(Error)));
    });

    it('views participants with data', async () => {
        const mockParticipants = [
            { id: 'p1', userId: 'u1', userNickname: 'User1', current: 5, target: 10, progressPercent: 50, status: 'ACTIVE', userAvatar: 'avatar.png' },
            { id: 'p2', userId: 'u2', userNickname: 'User2', current: 10, target: 10, progressPercent: 100, status: 'COMPLETED' }
        ];
        vi.mocked(challengeApi.getChallengeParticipants).mockResolvedValue(mockParticipants as any);
        const user = userEvent.setup();
        render(<ChallengeManagement />);
        await waitFor(() => expect(screen.getByText('Active Challenge')).toBeInTheDocument());

        const viewBtn = within(screen.getAllByRole('row')[1]).getAllByRole('button')[0];
        await user.click(viewBtn);

        await waitFor(() => expect(screen.getByText('User1')).toBeInTheDocument());
        expect(screen.getByText('User2')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('does not update if challenge has no ID', async () => {
        const noIdChallenge = {
            title: 'No ID Challenge', description: 'Desc', type: 'GREEN_TRIPS_DISTANCE',
            target: 10, reward: 100, status: 'ACTIVE', participants: 0,
            startTime: '2023-01-01', endTime: '2023-01-02'
        };

        vi.mocked(challengeApi.getAllChallenges).mockResolvedValue([noIdChallenge] as any);
        const user = userEvent.setup();

        render(<ChallengeManagement />);

        await waitFor(() => expect(screen.getByText('No ID Challenge')).toBeInTheDocument());

        // Edit
        const editBtn = within(screen.getAllByRole('row')[1]).getAllByRole('button')[1];
        await user.click(editBtn);

        await user.click(screen.getByRole('button', { name: 'Save Changes' }));

        expect(challengeApi.updateChallenge).not.toHaveBeenCalled();
    });
});
