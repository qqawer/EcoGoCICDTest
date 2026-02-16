import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserList, fetchUserDetail, updateUser, updateUserStatus, type UpdateUserRequest } from './userService';
import { api } from './auth';

// Mock the api instance from auth module
vi.mock('./auth', () => ({
    api: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
    },
}));

describe('userService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchUserList', () => {
        it('should call GET /users/list with default pagination', async () => {
            const mockData = { code: 200, message: 'success', data: { list: [], total: 0 } };
            vi.mocked(api.get).mockResolvedValue({ data: mockData });

            const result = await fetchUserList();

            expect(api.get).toHaveBeenCalledWith('/users/list?page=1&size=20');
            expect(result).toEqual(mockData);
        });

        it('should call GET /users/list with provided pagination', async () => {
            const mockData = { code: 200, message: 'success', data: { list: [], total: 0 } };
            vi.mocked(api.get).mockResolvedValue({ data: mockData });

            const result = await fetchUserList(2, 50);

            expect(api.get).toHaveBeenCalledWith('/users/list?page=2&size=50');
            expect(result).toEqual(mockData);
        });
    });

    describe('fetchUserDetail', () => {
        it('should call GET /users/detail/{userid}', async () => {
            const mockUser = { id: '1', userid: 'u1', nickname: 'User1' };
            const mockData = { code: 200, message: 'success', data: mockUser };
            vi.mocked(api.get).mockResolvedValue({ data: mockData });

            const result = await fetchUserDetail('u1');

            expect(api.get).toHaveBeenCalledWith('/users/detail/u1');
            expect(result).toEqual(mockData);
        });
    });

    describe('updateUser', () => {
        it('should call PUT /users/update/{userid} with data', async () => {
            const updateReq: UpdateUserRequest = {
                nickname: 'NewName',
                email: 'new@example.com',
                isDeactivated: false,
                isVipActive: true
            };
            const mockResponse = { code: 200, message: 'updated' };
            vi.mocked(api.put).mockResolvedValue({ data: mockResponse });

            const result = await updateUser('u1', updateReq);

            expect(api.put).toHaveBeenCalledWith('/users/update/u1', updateReq);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('updateUserStatus', () => {
        it('should call PUT /users/status/{userid} with isDeactivated payload', async () => {
            const mockResponse = { code: 200, message: 'status updated' };
            vi.mocked(api.put).mockResolvedValue({ data: mockResponse });

            const result = await updateUserStatus('u1', true);

            expect(api.put).toHaveBeenCalledWith('/users/status/u1', { isDeactivated: true });
            expect(result).toEqual(mockResponse);
        });
    });
});
