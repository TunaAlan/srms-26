import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../config/env';

export interface ApiErrorResponse {
  message: string;
  stack?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'department';
  };
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin' | 'department';
}

export interface RegisterResponse extends LoginResponse {}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'department';
}

export interface ApiClient {
  getAuthToken: () => Promise<string | null>;
  clearAuthToken: () => Promise<void>;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<UserProfile>;
}

const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

class AuthenticatedApiClient implements ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string | null) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.isRefreshing) {
            return new Promise<any>((resolve: (v: any) => void, reject: (r: any) => void) => {
              this.refreshQueue.push((token) => {
                if (token) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  resolve(this.client(originalRequest));
                } else {
                  reject(error);
                }
              });
            });
          }

          this.isRefreshing = true;

          try {
            const newAccessToken = await this.doRefresh();
            this.refreshQueue.forEach((cb) => cb(newAccessToken));
            this.refreshQueue = [];
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.client(originalRequest);
          } catch {
            this.refreshQueue.forEach((cb) => cb(null));
            this.refreshQueue = [];
            await this.clearAuthToken();
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async doRefresh(): Promise<string> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh token');

    const response = await axios.post(`${ENV.API_BASE_URL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);

    return accessToken;
  }

  async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async clearAuthToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Silent fail
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.client.post<LoginResponse>('/auth/login', data);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await this.client.post<RegisterResponse>('/auth/register', data);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await this.client.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Token zaten geçersizse sessizce devam et
    } finally {
      await this.clearAuthToken();
    }
  }

  async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await this.client.get<UserProfile>('/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.message || axiosError.message || 'An error occurred';
      const err = new Error(message);
      (err as any).statusCode = axiosError.response?.status;
      (err as any).originalError = axiosError;
      return err;
    }
    return error as Error;
  }
}

let apiClient: AuthenticatedApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClient) {
    apiClient = new AuthenticatedApiClient();
  }
  return apiClient;
}

export function resetApiClient(): void {
  apiClient = null;
}
