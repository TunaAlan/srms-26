import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { getApiClient } from './apiClient';

export interface Report {
  id: string;
  image: string;
  description: string;
  category: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
  status: 'beklemede' | 'inceleniyor' | 'cozuldu';
  criticality: 'kritik' | 'yuksek' | 'orta' | 'dusuk';
}

export interface CreateReportRequest {
  image: string;
  description: string;
  category: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface CreateReportResponse {
  id: string;
  message: string;
}

export interface ReportsApiClient {
  getReports: () => Promise<Report[]>;
  getReport: (id: string) => Promise<Report>;
  createReport: (data: CreateReportRequest) => Promise<CreateReportResponse>;
  updateReportStatus: (id: string, status: string) => Promise<Report>;
}

class ReportsApiClientImpl implements ReportsApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 10000,
    });

    // Add auth interceptor
    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const authClient = getApiClient();
      const token = await authClient.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async getReports(): Promise<Report[]> {
    try {
      // This endpoint will be created in the backend
      const response = await this.client.get<Report[]>('/reports');
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getReport(id: string): Promise<Report> {
    const response = await this.client.get<Report>(`/reports/${id}`);
    return response.data;
  }

  async createReport(data: CreateReportRequest): Promise<CreateReportResponse> {
    const response = await this.client.post<CreateReportResponse>('/reports', data);
    return response.data;
  }

  async updateReportStatus(id: string, status: string): Promise<Report> {
    const response = await this.client.patch<Report>(`/reports/${id}`, { status });
    return response.data;
  }
}

let reportsClient: ReportsApiClientImpl | null = null;

export function getReportsApiClient(): ReportsApiClient {
  if (!reportsClient) {
    reportsClient = new ReportsApiClientImpl();
  }
  return reportsClient;
}
