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
  token: string;
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
  setAuthToken: (token: string | null) => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  clearAuthToken: () => Promise<void>;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  getCurrentUser: () => Promise<UserProfile>;
}

class AuthenticatedApiClient implements ApiClient {
  private client: AxiosInstance;
  private tokenKey = 'auth_token';

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for handling errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        if (error.response?.status === 401) {
          await this.clearAuthToken();
        }
        return Promise.reject(error);
      }
    );

    // Request interceptor to add auth token
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
  }

  async setAuthToken(token: string | null): Promise<void> {
    if (token) {
      await SecureStore.setItemAsync(this.tokenKey, token);
    } else {
      await this.clearAuthToken();
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.tokenKey);
    } catch {
      return null;
    }
  }

  async clearAuthToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.tokenKey);
    } catch {
      // Silent fail
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.client.post<LoginResponse>('/auth/login', data);
      await this.setAuthToken(response.data.token);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await this.client.post<RegisterResponse>('/auth/register', data);
      await this.setAuthToken(response.data.token);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
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

// Singleton instance
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
