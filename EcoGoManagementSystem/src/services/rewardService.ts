import { api } from './auth';

export interface Reward {
    id: string;
    name: string | null;
    description: string | null;
    price: number | null; // This seems to be cash price, but we care about redemptionPoints
    stock: number;
    category: string | null;
    brand: string | null;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    isForRedemption: boolean;
    redemptionPoints: number;
    vipLevelRequired: number;
    redemptionLimit: number;
    totalRedemptionCount: number;
}

export interface RewardListResponse {
    code: number;
    message?: string;
    pagination: {
        page: number;
        totalPages: number;
        size: number;
        total: number;
    };
    data: Reward[];
}

export interface OrderItem {
    goodsId: string;
    goodsName: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export interface Order {
    id: string;
    orderNumber: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    shippingFee: number;
    finalAmount: number;
    status: 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED'; // Added likely statuses
    paymentMethod: string;
    paymentStatus: string;
    shippingAddress: string | null;
    recipientName: string | null;
    recipientPhone: string | null;
    remark: string | null;
    createdAt: string;
    updatedAt: string;
    trackingNumber: string | null;
    carrier: string | null;
    isRedemptionOrder: boolean;
    pointsUsed: number;
    pointsEarned: number;
}

export interface OrderListResponse {
    code: number;
    message: string;
    data: {
        pagination: {
            page: number;
            total: number;
            size: number;
            totalPages: number;
        };
        orders: Order[];
    };
}

export const fetchRewards = async (page: number = 1, size: number = 20): Promise<RewardListResponse> => {
    const response = await api.get<RewardListResponse>(`/goods?page=${page}&size=${size}&_t=${Date.now()}`, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

export interface CreateRewardRequest {
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    brand: string;
    imageUrl: string;
    isActive: boolean;
    isForRedemption: boolean;
    redemptionPoints: number;
    vipLevelRequired: number;
    redemptionLimit: number;
}

// Fetch orders list with pagination
export const fetchOrders = async (page: number = 1, size: number = 10): Promise<OrderListResponse> => {
    const response = await api.get<OrderListResponse>(`/orders?page=${page}&size=${size}`, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

export const createReward = async (data: CreateRewardRequest): Promise<unknown> => {
    const response = await api.post('/goods', data, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

export const updateReward = async (id: string, data: Partial<CreateRewardRequest>): Promise<unknown> => {
    const response = await api.put(`/goods/${id}`, data, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

export const deleteReward = async (id: string): Promise<unknown> => {
    const response = await api.delete(`/goods/${id}`, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

// ----- Vouchers API -----

export const fetchVouchers = async (page: number = 1, size: number = 20): Promise<RewardListResponse> => {
    const response = await api.get<RewardListResponse>(`/goods/admin/vouchers?page=${page}&size=${size}&_t=${Date.now()}`, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

export const createVoucher = async (data: CreateRewardRequest): Promise<unknown> => {
    const response = await api.post('/goods/admin/vouchers', data, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

export const updateVoucher = async (id: string, data: Partial<CreateRewardRequest>): Promise<unknown> => {
    const response = await api.put(`/goods/admin/vouchers/${id}`, data, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

export const deleteVoucher = async (id: string): Promise<unknown> => {
    const response = await api.delete(`/goods/admin/vouchers/${id}`, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};

// ----- Categories API -----

export interface CategoryResponse {
    code: number;
    message: string;
    data: {
        default: string;
        allItemsKey: string;
        categories: string[];
    };
}

export const fetchCategories = async (): Promise<CategoryResponse> => {
    const response = await api.get<CategoryResponse>(`/goods/categories?_t=${Date.now()}`, { baseURL: 'http://18.141.213.152:8090/api/v1' });
    return response.data;
};
