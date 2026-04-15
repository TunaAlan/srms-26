import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { getApiClient } from './apiClient';

export interface Report {
  id: string;
  image: string;
  description: string;
  userDescription: string;
  aiDescription: string;
  category: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
  status: 'beklemede' | 'inceleniyor' | 'cozuldu' | 'reddedildi';
  criticality: 'kritik' | 'yuksek' | 'orta' | 'dusuk';
}

export interface CreateReportRequest {
  image: string; // local URI
  description?: string;
  userCategory?: string;
  latitude: number;
  longitude: number;
}

export interface CreateReportResponse {
  id: string;
}

export interface ReportsApiClient {
  getReports: () => Promise<Report[]>;
  getReport: (id: string) => Promise<Report>;
  createReport: (data: CreateReportRequest) => Promise<CreateReportResponse>;
}


const CATEGORY_LABEL_MAP: Record<string, string> = {
  road_damage:      'Yol Hasarı',
  sidewalk_damage:  'Kaldırım Hasarı',
  waste:            'Çöp / Atık',
  pollution:        'Çevre Kirliliği',
  green_space:      'Yeşil Alan',
  lighting:         'Aydınlatma',
  traffic_sign:     'Trafik İşareti',
  sewage_water:     'Kanalizasyon / Su',
  infrastructure:   'Altyapı',
  vandalism:        'Vandalizm',
  stray_animal:     'Başıboş Hayvan',
  natural_disaster: 'Doğal Afet',
  normal:           'Normal',
  irrelevant:       'İlgisiz',
};

function mapPriority(priority: string | null): Report['criticality'] {
  if (!priority) return 'dusuk';
  const p = priority.toLowerCase();
  if (p.includes('critical') || p.includes('5')) return 'kritik';
  if (p.includes('high') || p.includes('4')) return 'yuksek';
  if (p.includes('medium') || p.includes('3')) return 'orta';
  return 'dusuk';
}

function mapReportFromApi(r: Record<string, any>): Report {
  const STATUS_MAP: Record<string, Report['status']> = {
    pending: 'beklemede',
    approved: 'cozuldu',
    rejected: 'reddedildi',
    redirected: 'inceleniyor',
  };

  const filename = r.imagePath ? r.imagePath.split('/').pop() : null;

  return {
    id: r.id,
    image: filename ? `${ENV.API_BASE_URL}/reports/images/${filename}` : '',
    description: r.aiDescription || r.description || '',
    userDescription: r.description || '',
    aiDescription: r.aiDescription || '',
    category: r.aiCategory || '',
    categoryLabel: CATEGORY_LABEL_MAP[r.aiCategory] || r.aiCategory || 'Diğer',
    latitude: r.latitude || 0,
    longitude: r.longitude || 0,
    address: r.aiUnit || '',
    timestamp: new Date(r.createdAt).getTime(),
    status: STATUS_MAP[r.status] || 'beklemede',
    criticality: mapPriority(r.aiPriority),
  };
}

class ReportsApiClientImpl implements ReportsApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 30000,
    });

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
    const response = await this.client.get<Record<string, any>[]>('/reports/my');
    return response.data.map(mapReportFromApi);
  }

  async getReport(id: string): Promise<Report> {
    const response = await this.client.get<Record<string, any>>(`/reports/${id}`);
    return mapReportFromApi(response.data);
  }

  async createReport(data: CreateReportRequest): Promise<CreateReportResponse> {
    const formData = new FormData();
    formData.append('image', {
      uri: data.image,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    if (data.description) formData.append('description', data.description);
    if (data.userCategory) formData.append('userCategory', data.userCategory);
    formData.append('latitude', String(data.latitude));
    formData.append('longitude', String(data.longitude));

    const response = await this.client.post<CreateReportResponse>('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
