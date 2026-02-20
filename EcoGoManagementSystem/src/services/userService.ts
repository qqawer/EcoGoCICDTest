import { api } from './auth';

export interface UserStats {
    totalTrips: number;
    totalDistance: number;
    greenDays: number;
    weeklyRank: number;
    monthlyRank: number;
    totalPointsFromTrips: number;
}

export interface UserPreferences {
    preferredTransport: string | null;
    enablePush: boolean;
    enableEmail: boolean;
    enableBusReminder: boolean;
    language: string;
    theme: string | null;
    shareLocation: boolean;
    showOnLeaderboard: boolean;
    shareAchievements: boolean;
}

export interface UserVip {
    startDate: string | null;
    expiryDate: string | null;
    plan: string | null;
    autoRenew: boolean;
    pointsMultiplier: number;
    active: boolean;
}

export interface User {
    id: string;
    userid: string;
    email: string | null;
    phone: string;
    nickname: string;
    avatar: string | null;
    vip: UserVip;
    stats: UserStats;
    preferences: UserPreferences;
    totalCarbon: number;
    totalPoints: number;
    currentPoints: number;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    activityMetrics: Record<string, unknown> | null; // Define strictly if needed
    admin: boolean;
    deactivated: boolean;
    isAdmin: boolean;
    isDeactivated: boolean;
}

export interface UserListResponse {
    code: number;
    message: string;
    data: {
        list: User[];
        total: number;
        page: number;
        size: number;
        totalPages: number;
    };
}

export interface UserDetailResponse {
    code: number;
    message: string;
    data: User;
}

// Fetch user list with pagination
export const fetchUserList = async (page: number = 1, size: number = 20): Promise<UserListResponse> => {
    const response = await api.get<UserListResponse>(`/users/list?page=${page}&size=${size}`);
    return response.data;
};

// Fetch user detail
export const fetchUserDetail = async (userid: string): Promise<UserDetailResponse> => {
    const response = await api.get<UserDetailResponse>(`/users/detail/${userid}`);
    return response.data;
};

export interface UpdateUserRequest {
    nickname: string;
    email: string | null;
    isDeactivated: boolean;
    isVipActive: boolean;
    vipPlan?: string;
    vipExpiryDate?: string;
}

// Update user details
export const updateUser = async (userid: string, data: UpdateUserRequest): Promise<unknown> => {
    const response = await api.put(`/users/update/${userid}`, data);
    return response.data;
};

// Update user status (Deactivate/Activate)
export const updateUserStatus = async (userid: string, isDeactivated: boolean): Promise<unknown> => {
    const response = await api.put(`/users/status/${userid}`, { isDeactivated });
    return response.data;
};
