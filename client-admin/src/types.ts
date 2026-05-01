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
  status: 'pending' | 'in_review' | 'in_progress' | 'resolved' | 'rejected';
  criticality: 'kritik' | 'yuksek' | 'orta' | 'dusuk' | 'belirsiz';
  resolution: string;
  reviewStatus: 'approved' | 'corrected' | 'rejected' | null;
  rejectReason: string | null;
  reviewedByName: string | null;
  aiConfidence: number | null;
  aiUnit: string | null;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'review_personnel';
  isActive: boolean;
  createdAt: string;
}

export type TabState = 'dashboard' | 'reports' | 'map' | 'review' | 'personnel';

export type UserRole = 'admin' | 'review_personnel';
