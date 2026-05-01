export function getTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'Az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function getStatusLabel(s: string): string {
  return (
    ({
      pending:     'Beklemede',
      in_review:   'İncelemede',
      in_progress: 'İşlemde',
      resolved:    'Çözüldü',
      rejected:    'Reddedildi',
    } as Record<string, string>)[s] || s
  );
}

export function getCriticalityLabel(c: string): string {
  return (
    ({ kritik: 'Kritik', yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük', belirsiz: '—' } as Record<
      string,
      string
    >)[c] || c
  );
}

export const CATEGORY_LABEL_MAP: Record<string, string> = {
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

export function getCategoryLabel(id: string): string {
  return CATEGORY_LABEL_MAP[id] || id;
}

const _STATUS_TO_UI: Record<string, string> = {
  pending:     'pending',
  in_review:   'in_review',
  in_progress: 'in_progress',
  resolved:    'resolved',
  rejected:    'rejected',
};


function mapPriority(priority?: string): 'kritik' | 'yuksek' | 'orta' | 'dusuk' | 'belirsiz' {
  if (!priority) return 'belirsiz';
  const p = priority.toLowerCase();
  if (p.includes('critical') || p.includes('kritik') || p.includes('5')) return 'kritik';
  if (p.includes('high') || p.includes('yuksek') || p.includes('yüksek') || p.includes('4')) return 'yuksek';
  if (p.includes('medium') || p.includes('moderate') || p.includes('orta') || p.includes('3')) return 'orta';
  return 'dusuk';
}

const UNIT_NORMALIZE: Record<string, string> = {
  'Fen Isleri':        'Fen İşleri',
  'Fen İşleri':        'Fen İşleri',
  'Temizlik Isleri':   'Temizlik İşleri',
  'Temizlik İşleri':   'Temizlik İşleri',
  'Cevre Koruma':      'Çevre Koruma',
  'Çevre Koruma':      'Çevre Koruma',
  'Park ve Bahceler':  'Park ve Bahçeler',
  'Park ve Bahçeler':  'Park ve Bahçeler',
  'Elektrik Birimi':   'Elektrik Birimi',
  'Trafik Birimi':     'Trafik Birimi',
  'Su ve Kanalizasyon':'Su ve Kanalizasyon',
  'Zabita':            'Zabıta',
  'Zabıta':            'Zabıta',
  'Veteriner Birimi':  'Veteriner Birimi',
  'Afet Koordinasyon': 'Afet Koordinasyon',
  'ASKİ':              'ASKİ',
};

export function mapReport(r: any): any {
  const filename = r.imagePath ? r.imagePath.split('/').pop() : null;
  return {
    id: r.id,
    image: filename ? `/api/reports/images/${filename}` : null,
    description: r.aiDescription || r.rejectReason || '',
    userDescription: r.userDescription || '',
    category: r.aiCategory || '',
    categoryLabel: r.aiCategory ? (CATEGORY_LABEL_MAP[r.aiCategory] || r.aiCategory) : 'Analiz Bekleniyor',
    userCategory: r.userCategory || '',
    latitude: r.latitude || 0,
    longitude: r.longitude || 0,
    address: r.address || '',
    aiUnit: r.aiUnit ? (UNIT_NORMALIZE[r.aiUnit] ?? r.aiUnit) : null,
    timestamp: new Date(r.createdAt).getTime(),
    status: _STATUS_TO_UI[r.status] || 'pending',
    criticality: mapPriority(r.aiPriority),
    resolution: r.staffNote || '',
    reviewStatus: r.reviewStatus || null,
    rejectReason: r.rejectReason || null,
    reviewedByName: r.reviewer?.name ?? null,
    aiConfidence: r.aiConfidence ?? null,
  };
}

export function getConfidenceColor(confidence: number | null): string {
  if (confidence === null) return 'var(--text-tertiary)';
  if (confidence >= 0.8) return 'var(--success)';
  if (confidence >= 0.6) return 'var(--warning)';
  return 'var(--danger)';
}

export function getConfidenceLabel(confidence: number | null): string {
  if (confidence === null) return '—';
  return `${Math.round(confidence * 100)}%`;
}

export function getReviewStatusLabel(s: string | null): string {
  if (!s) return '—';
  return (
    ({
      approved:  'Onaylandı',
      corrected: 'Düzeltildi',
      rejected:  'Reddedildi',
    } as Record<string, string>)[s] || s
  );
}


export function getRoleLabel(role: string): string {
  return (
    ({
      admin: 'Admin',
      review_personnel: 'İnceleme Personeli',
    } as Record<string, string>)[role] || role
  );
}
