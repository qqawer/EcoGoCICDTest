import axios from 'axios';

export interface LoginRequest {
    userid: string;
    password?: string;
}

export interface UserInfo {
    id: string;
    userid: string;
    nickname: string;
    isAdmin: boolean;
    vip: {
        expiryDate: string;
        plan: string;
        autoRenew: boolean;
        pointsMultiplier: number;
        active: boolean;
    };
}

export interface LoginResponse {
    code: number;
    message: string;
    data: {
        token: string;
        expire_at: string;
        user_info: UserInfo;
        admin_info: null | unknown;
    };
}

// 核心修正：baseURL 改为完整的后端地址，而非相对路径！
export const api = axios.create({
    baseURL: 'http://13.229.148.21:8090/api/v1/web', // 原错误：'/api/v1/web'
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token and optional redirect logic (handled by UI usually)
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminInfo');
            // window.location.href = '/admin'; // Optional: force redirect
        }
        return Promise.reject(error);
    }
);

export const loginAdmin = async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
        const response = await api.post<LoginResponse>('/users/login', credentials);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // Handle Axios errors
            const message = error.response?.data?.message || error.message || 'Login failed';
            throw new Error(message);
        }
        throw error;
    }
};