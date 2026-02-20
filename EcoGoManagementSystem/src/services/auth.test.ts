import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginAdmin } from './auth';

// We need to mock axios because auth.ts imports it and creates an instance
const mocks = vi.hoisted(() => ({
    post: vi.fn(),
    get: vi.fn(),
}));

vi.mock('axios', () => {
    return {
        default: {
            create: vi.fn(() => ({
                post: mocks.post,
                get: mocks.get,
                interceptors: {
                    request: { use: vi.fn() },
                    response: { use: vi.fn() },
                }
            })),
            isAxiosError: (payload: unknown) => !!(payload as Record<string, unknown>)?.isAxiosError,
        }
    };
});

describe('auth service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loginAdmin', () => {
        const credentials = { userid: 'admin', password: 'password' };

        it('should call api.post with correct parameters and return data on success', async () => {
            const mockResponse = {
                data: {
                    code: 200,
                    message: 'Success',
                    data: {
                        token: 'fake-token',
                        expire_at: '2026-12-31',
                        user_info: { id: '1', userid: 'admin', nickname: 'Admin', isAdmin: true, vip: {} },
                        admin_info: null
                    }
                }
            };
            mocks.post.mockResolvedValue(mockResponse);

            const result = await loginAdmin(credentials);

            expect(mocks.post).toHaveBeenCalledWith('/users/login', credentials);
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw error with message from response when axios error occurs', async () => {
            const errorResponse = {
                isAxiosError: true,
                response: {
                    data: { message: 'Invalid credentials' }
                }
            };
            mocks.post.mockRejectedValue(errorResponse);

            await expect(loginAdmin(credentials)).rejects.toThrow('Invalid credentials');
        });

        it('should throw default error message when response message is missing', async () => {
            const errorResponse = {
                isAxiosError: true,
                message: 'Network Error'
            };
            mocks.post.mockRejectedValue(errorResponse);

            await expect(loginAdmin(credentials)).rejects.toThrow('Network Error');
        });

        it('should throw generic error if not axios error', async () => {
            const error = new Error('Unknown error');
            mocks.post.mockRejectedValue(error);

            await expect(loginAdmin(credentials)).rejects.toThrow('Unknown error');
        });
    });
});
