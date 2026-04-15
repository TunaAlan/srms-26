export interface Report {
  id: string;
  image: string | null;
  description: string;
  userDescription: string;
  category: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
  status: 'beklemede' | 'inceleniyor' | 'cozuldu' | 'reddedildi';
  criticality: 'kritik' | 'yuksek' | 'orta' | 'dusuk';
  resolution: string;
}

export type TabState = 'dashboard' | 'reports' | 'map';
