import { api } from './auth';

export interface VipSwitch {
    id: string;
    switchKey: string;
    displayName: string;
    description: string;
    updatedAt: string;
    updatedBy: string;
    enabled: boolean;
}

export interface VipSwitchListResponse {
    code: number;
    message: string;
    data: VipSwitch[];
}

export interface VipSwitchResponse {
    code: number;
    message: string;
    data: {
        key: string;
        isEnabled: boolean;
    };
}

export interface UpdateVipSwitchRequest {
    switchKey: string;
    isEnabled: boolean;
    updatedBy: string;
}

export const fetchVipSwitches = async (): Promise<VipSwitchListResponse> => {
    const response = await api.get<VipSwitchListResponse>('/admin/vip-switches', { baseURL: 'http://13.229.148.21:8090/api/v1' });
    return response.data;
};

export const updateVipSwitch = async (data: UpdateVipSwitchRequest): Promise<VipSwitchResponse> => {
    const response = await api.post('/admin/vip-switches', data, { baseURL: 'http://13.229.148.21:8090/api/v1' });
    return response.data;
};
