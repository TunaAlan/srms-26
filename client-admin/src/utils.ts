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
      beklemede: 'Beklemede',
      inceleniyor: 'İnceleniyor',
      cozuldu: 'Çözüldü',
      reddedildi: 'Reddedildi',
    } as Record<string, string>)[s] || s
  );
}

export function getCriticalityLabel(c: string): string {
  return (
    ({ kritik: 'Kritik', yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük' } as Record<
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
  pending: 'beklemede',
  approved: 'cozuldu',
  rejected: 'reddedildi',
  redirected: 'inceleniyor',
};

function mapPriority(priority?: string): 'kritik' | 'yuksek' | 'orta' | 'dusuk' {
  if (!priority) return 'dusuk';
  const p = priority.toLowerCase();
  if (p.includes('critical') || p.includes('5')) return 'kritik';
  if (p.includes('high') || p.includes('4')) return 'yuksek';
  if (p.includes('medium') || p.includes('3')) return 'orta';
  return 'dusuk';
}

export function mapReport(r: any): any {
  const filename = r.imagePath ? r.imagePath.split('/').pop() : null;
  return {
    id: r.id,
    image: filename ? `/api/reports/images/${filename}` : null,
    description: r.aiDescription || '',
    userDescription: r.description || '',
    category: r.aiCategory || '',
    categoryLabel: CATEGORY_LABEL_MAP[r.aiCategory] || r.aiCategory || 'Diğer',
    userCategory: r.userCategory || '',
    latitude: r.latitude || 0,
    longitude: r.longitude || 0,
    address: r.aiUnit || '',
    timestamp: new Date(r.createdAt).getTime(),
    status: _STATUS_TO_UI[r.status] || 'beklemede',
    criticality: mapPriority(r.aiPriority),
    resolution: r.staffNote || '',
  };
}
