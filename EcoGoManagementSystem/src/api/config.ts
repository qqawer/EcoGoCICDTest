// API 配置文件
export const API_BASE_URL = 'http://13.229.148.21:8090/api/v1';

// 响应类型（与后端 ResponseMessage 对应）
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 通用请求函数
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
