import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVipSwitches, updateVipSwitch, type UpdateVipSwitchRequest } from './vipService';
import { api } from './auth';

vi.mock('./auth', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

describe('vipService', () => {
    const BASE_URL = 'http://13.229.148.21:8090/api/v1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchVipSwitches', () => {
        it('should call GET /admin/vip-switches', async () => {
            const mockData = { code: 200, data: [] };
            vi.mocked(api.get).mockResolvedValue({ data: mockData });

            const result = await fetchVipSwitches();

            expect(api.get).toHaveBeenCalledWith('/admin/vip-switches', { baseURL: BASE_URL });
            expect(result).toEqual(mockData);
        });
    });

    describe('updateVipSwitch', () => {
        it('should call POST /admin/vip-switches with playload', async () => {
            const payload: UpdateVipSwitchRequest = {
                switchKey: 'feature1',
                isEnabled: true,
                updatedBy: 'admin'
            };
            const mockResponse = { code: 200, data: { key: 'feature1', isEnabled: true } };
            vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

            const result = await updateVipSwitch(payload);

            expect(api.post).toHaveBeenCalledWith('/admin/vip-switches', payload, { baseURL: BASE_URL });
            expect(result).toEqual(mockResponse);
        });
    });
});
