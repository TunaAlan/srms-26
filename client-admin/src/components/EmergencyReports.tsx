import React, { useState } from 'react';
import type { Report } from '../types';
import {
  getTimeAgo,
  getCriticalityLabel,
  getForwardStatusLabel,
} from '../utils';

interface EmergencyReportsProps {
  reports: Report[];
  role: string;
  onForward: (report: Report) => void;
  onDelete?: (id: string) => void;
  onViewArchive?: (report: Report) => void;
}

type TabFilter = 'urgent' | 'normal' | 'archive';
type SortKey = 'category' | 'criticality' | 'forwardStatus' | 'timestamp';
type SortDir = 'asc' | 'desc';

const CRITICALITY_ORDER: Record<string, number> = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };
const FORWARD_ORDER: Record<string, number> = { forwarded: 0, completed: 1 };

export const EmergencyReports: React.FC<EmergencyReportsProps> = ({ reports, role, onForward, onDelete, onViewArchive }) => {
  const [sortKey, setSortKey] = useState<SortKey>('criticality');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'timestamp' ? 'desc' : 'asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: '#dc2626' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  const [tabFilter, setTabFilterState] = useState<TabFilter>(
    () => (sessionStorage.getItem('em_criticality') as TabFilter) || 'urgent'
  );
  const setTabFilter = (v: TabFilter) => {
    sessionStorage.setItem('em_criticality', v);
    setTabFilterState(v);
  };

  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active reports (not completed)
  const active = reports.filter(
    (r) => (r.status === 'in_progress' || r.status === 'resolved') && r.forwardStatus !== 'completed'
  );
  const archived = reports.filter((r) => r.forwardStatus === 'completed');

  const urgentReports = active.filter((r) => r.criticality === 'kritik' || r.criticality === 'yuksek');
  const normalReports = active.filter((r) => r.criticality !== 'kritik' && r.criticality !== 'yuksek');

  const applyFilters = (list: Report[]) => list.filter((r) => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.description.toLowerCase().includes(q) ||
        (r.aiUnit || '').toLowerCase().includes(q) ||
        r.categoryLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sortList = (list: Report[]) => [...list].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'category')      cmp = a.categoryLabel.localeCompare(b.categoryLabel, 'tr');
    if (sortKey === 'criticality')   cmp = (CRITICALITY_ORDER[a.criticality] ?? 9) - (CRITICALITY_ORDER[b.criticality] ?? 9);
    if (sortKey === 'forwardStatus') cmp = (FORWARD_ORDER[a.forwardStatus ?? ''] ?? 9) - (FORWARD_ORDER[b.forwardStatus ?? ''] ?? 9);
    if (sortKey === 'timestamp')     cmp = a.timestamp - b.timestamp;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const baseQueue =
    tabFilter === 'archive'
      ? applyFilters(archived)
      : applyFilters(tabFilter === 'urgent' ? urgentReports : normalReports);

  const queue = sortList(baseQueue);

  const BANNER = (
    <div style={{
      background: '#fff1f2',
      border: '1px solid #fca5a5',
      borderLeft: '4px solid #dc2626',
      borderRadius: '8px',
      padding: '14px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ fontSize: '18px' }}>🚨</span>
      <div>
        <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '15px' }}>Müdahale Kuyruğu</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '10px' }}>
          İnceleme sonrası aktif raporlar — kritik ve yüksek öncelikliler için acil iletim yapın
        </span>
      </div>
    </div>
  );

  const badgeDotColor = (criticality: string) => {
    if (criticality === 'kritik') return 'var(--critical)';
    if (criticality === 'yuksek') return 'var(--high)';
    if (criticality === 'orta') return 'var(--medium)';
    return 'var(--low)';
  };

  return (
    <>
      {BANNER}

      <div className="filters-bar">
        <span className="filter-label">Öncelik:</span>

        <button
          onClick={() => setTabFilter('urgent')}
          className={tabFilter === 'urgent' ? 'filter-toggle-active filter-toggle-danger' : 'filter-toggle'}
        >
          🚨 Acil
          <span className="filter-toggle-badge">{urgentReports.length}</span>
        </button>

        <button
          onClick={() => setTabFilter('normal')}
          className={tabFilter === 'normal' ? 'filter-toggle-active' : 'filter-toggle'}
        >
          Normal
          <span className="filter-toggle-badge">{normalReports.length}</span>
        </button>

        <button
          onClick={() => setTabFilter('archive')}
          className={tabFilter === 'archive' ? 'filter-toggle-active' : 'filter-toggle'}
          style={tabFilter !== 'archive' ? { color: 'var(--text-tertiary)' } : {}}
        >
          📁 Arşiv
          <span className="filter-toggle-badge">{archived.length}</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">Tüm Kategoriler</option>
            <option value="road_damage">Yol Hasarı</option>
            <option value="sidewalk_damage">Kaldırım Hasarı</option>
            <option value="waste">Çöp / Atık</option>
            <option value="pollution">Çevre Kirliliği</option>
            <option value="green_space">Yeşil Alan</option>
            <option value="lighting">Aydınlatma</option>
            <option value="traffic_sign">Trafik İşareti</option>
            <option value="sewage_water">Kanalizasyon / Su</option>
            <option value="infrastructure">Altyapı</option>
            <option value="vandalism">Vandalizm</option>
            <option value="stray_animal">Başıboş Hayvan</option>
            <option value="natural_disaster">Doğal Afet</option>
          </select>
          <input
            type="text"
            className="filter-search"
            placeholder="🔍 Ara... (açıklama, birim)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {tabFilter === 'urgent' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff1f2', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>🚨</span>
          <div>
            <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '13px' }}>Kritik ve Yüksek Öncelikli</span>
            <span style={{ color: '#991b1b', fontSize: '12px', marginLeft: '8px' }}>İnceleme sonrası acil müdahale gerektiren raporlar.</span>
          </div>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#dc2626', fontSize: '20px' }}>{urgentReports.length}</span>
        </div>
      )}

      {tabFilter === 'normal' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff', border: '1px solid #93c5fd', borderLeft: '4px solid #2563eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>📋</span>
          <div>
            <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '13px' }}>Orta ve Düşük Öncelikli</span>
            <span style={{ color: '#1e40af', fontSize: '12px', marginLeft: '8px' }}>Acil olmayan, takip gerektiren onaylanmış raporlar.</span>
          </div>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#2563eb', fontSize: '20px' }}>{normalReports.length}</span>
        </div>
      )}

      {tabFilter === 'archive' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <div>
            <span style={{ fontWeight: 700, color: '#15803d', fontSize: '13px' }}>Tamamlanan Müdahaleler</span>
            <span style={{ color: '#166534', fontSize: '12px', marginLeft: '8px' }}>Bu raporlar başarıyla tamamlandı ve kayıt amacıyla arşivlendi.</span>
          </div>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#16a34a', fontSize: '20px' }}>{archived.length}</span>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ fontSize: '15px', fontWeight: 600 }}>
            {tabFilter === 'archive' ? 'Arşivde rapor yok' : 'Bu kategoride rapor yok'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fotoğraf</th>
                <th>Açıklama / Konum</th>
                <th style={thStyle} onClick={() => handleSort('category')}>Kategori <SortIcon col="category" /></th>
                <th style={thStyle} onClick={() => handleSort('criticality')}>Aciliyet <SortIcon col="criticality" /></th>
                {tabFilter !== 'archive' && (
                  <th style={thStyle} onClick={() => handleSort('forwardStatus')}>İletim Durumu <SortIcon col="forwardStatus" /></th>
                )}
                <th style={thStyle} onClick={() => handleSort('timestamp')}>Zaman <SortIcon col="timestamp" /></th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((r) => {
                const alreadyForwarded = r.forwardStatus !== null;

                return (
                  <tr
                    key={r.id}
                    style={{ cursor: tabFilter === 'archive' || role === 'emergency' ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (tabFilter === 'archive') onViewArchive?.(r);
                      else if (role === 'emergency') onForward(r);
                    }}
                  >
                    <td>
                      <img
                        src={r.image || ''}
                        className="report-image"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </td>
                    <td>
                      <div className="report-desc">{r.description || '—'}</div>
                      <div className="report-address">
                        {r.address && <span>📍 {r.address}</span>}
                        {r.aiUnit && <span style={{ marginLeft: r.address ? '8px' : '0' }}>🏢 {r.aiUnit}</span>}
                      </div>
                      {tabFilter === 'archive' && r.forwardNote && (
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📝 {r.forwardNote}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>
                        {r.categoryLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${r.criticality}`}>
                        <span className="badge-dot" style={{ background: badgeDotColor(r.criticality) }}></span>{' '}
                        {getCriticalityLabel(r.criticality)}
                      </span>
                    </td>
                    {tabFilter !== 'archive' && (
                      <td>
                        {r.forwardStatus ? (
                          <span className={`badge badge-forward-${r.forwardStatus}`}>
                            {getForwardStatusLabel(r.forwardStatus)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>İletilmedi</span>
                        )}
                        {r.forwardNote && (
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.forwardNote}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="time-cell">{getTimeAgo(r.timestamp)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {tabFilter === 'archive' ? (
                        role === 'super_admin' ? (
                          <button
                            className="btn btn-reject"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => onDelete?.(r.id)}
                          >
                            🗑️ Sil
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>
                        )
                      ) : role === 'emergency' ? (
                        <button
                          className="btn btn-forward"
                          onClick={() => onForward(r)}
                          title={alreadyForwarded ? 'Yeniden İlet' : 'Acil İlet'}
                        >
                          🚨 {alreadyForwarded ? 'Güncelle' : 'İlet'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Yalnızca Acil Ekibi</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
