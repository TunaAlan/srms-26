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

const CATEGORY_MAP: Record<string, string> = {
  road_damage: 'yol',
  sidewalk_damage: 'yol',
  infrastructure: 'yol',
  traffic_sign: 'yol',
  sewage_water: 'su',
  waste: 'cop',
  pollution: 'cop',
  green_space: 'park',
  lighting: 'elektrik',
  vandalism: 'diger',
  stray_animal: 'diger',
  natural_disaster: 'diger',
  normal: 'diger',
  irrelevant: 'diger',
};

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
    category: CATEGORY_MAP[r.aiCategory] || 'diger',
    categoryLabel: r.aiUnit || r.aiCategory || 'Diğer',
    latitude: r.latitude || 0,
    longitude: r.longitude || 0,
    address: r.aiUnit || '',
    timestamp: new Date(r.createdAt).getTime(),
    status: _STATUS_TO_UI[r.status] || 'beklemede',
    criticality: mapPriority(r.aiPriority),
    resolution: r.staffNote || '',
  };
}
