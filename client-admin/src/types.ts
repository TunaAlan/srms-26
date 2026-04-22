export interface Report {
  id: string;
  image: string | null;
  description: string;
  userDescription: string;
  userCategory: string;
  category: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  criticality: 'kritik' | 'yuksek' | 'orta' | 'dusuk';
  resolution: string;
  reviewStatus: 'pending' | 'approved' | 'corrected' | 'rejected' | null;
  rejectReason: string | null;
  forwardNote: string | null;
  forwardStatus: 'forwarded' | 'completed' | null;
  aiConfidence: number | null;
  aiUnit: string | null;
}

export type TabState = 'dashboard' | 'reports' | 'map' | 'review' | 'emergency';

export type UserRole = 'super_admin' | 'review' | 'emergency';
