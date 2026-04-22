import React, { useState } from 'react';
import type { Report, UserRole } from '../types';
import { getTimeAgo, getStatusLabel, getCriticalityLabel } from '../utils';

type SortKey = 'category' | 'status' | 'criticality' | 'timestamp';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<string, number> = { pending: 0, in_progress: 1, resolved: 2, rejected: 3 };
const CRIT_ORDER: Record<string, number>   = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };

interface ReportsListProps {
  reports: Report[];
  role: UserRole;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  filterCriticality: string;
  setFilterCriticality: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  reports,
  role,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  filterCriticality,
  setFilterCriticality,
  searchQuery,
  setSearchQuery,
  onView,
  onDelete,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'timestamp' ? 'desc' : 'asc');
    }
  };

  const filtered = reports.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (filterCriticality !== 'all' && r.criticality !== filterCriticality) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.description.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.categoryLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'category')    cmp = a.categoryLabel.localeCompare(b.categoryLabel, 'tr');
    if (sortKey === 'status')      cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (sortKey === 'criticality') cmp = (CRIT_ORDER[a.criticality] ?? 9) - (CRIT_ORDER[b.criticality] ?? 9);
    if (sortKey === 'timestamp')   cmp = a.timestamp - b.timestamp;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: 'var(--primary)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  return (
    <>
      <div className="filters-bar">
        <span className="filter-label">Filtrele:</span>
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Tüm Durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="in_progress">İşlemde</option>
          <option value="resolved">Çözüldü</option>
        </select>
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
          <option value="normal">Normal</option>
          <option value="irrelevant">İlgisiz</option>
        </select>
        <select className="filter-select" value={filterCriticality} onChange={(e) => setFilterCriticality(e.target.value)}>
          <option value="all">Tüm Aciliyetler</option>
          <option value="kritik">Kritik</option>
          <option value="yuksek">Yüksek</option>
          <option value="orta">Orta</option>
          <option value="dusuk">Düşük</option>
        </select>
        <input
          type="text"
          className="filter-search"
          placeholder="🔍 Ara... (açıklama, adres, kategori)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="table-container">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Sonuç Bulunamadı</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Filtre kriterlerinize uygun bildirim yok</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fotoğraf</th>
                <th>Açıklama / Konum</th>
                <th style={thStyle} onClick={() => handleSort('category')}>
                  Kategori <SortIcon col="category" />
                </th>
                <th style={thStyle} onClick={() => handleSort('status')}>
                  Durum <SortIcon col="status" />
                </th>
                <th style={thStyle} onClick={() => handleSort('criticality')}>
                  Aciliyet <SortIcon col="criticality" />
                </th>
                <th style={thStyle} onClick={() => handleSort('timestamp')}>
                  Zaman <SortIcon col="timestamp" />
                </th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                let badgeDotColor = 'var(--low)';
                if (r.criticality === 'kritik') badgeDotColor = 'var(--critical)';
                else if (r.criticality === 'yuksek') badgeDotColor = 'var(--high)';
                else if (r.criticality === 'orta') badgeDotColor = 'var(--medium)';

                return (
                  <tr key={r.id}>
                    <td>
                      <img
                        src={r.image || ''}
                        className="report-image"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </td>
                    <td>
                      <div className="report-desc">{r.description}</div>
                      <div className="report-address">
                        {r.address && <span>📍 {r.address}</span>}
                        {r.aiUnit && <span style={{ marginLeft: r.address ? '8px' : '0' }}>🏢 {r.aiUnit}</span>}
                      </div>
                      {r.resolution && <div className="resolution-note">✅ {r.resolution}</div>}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>
                        {r.categoryLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${r.criticality}`}>
                        <span className="badge-dot" style={{ background: badgeDotColor }}></span>{' '}
                        {getCriticalityLabel(r.criticality)}
                      </span>
                    </td>
                    <td className="time-cell">{getTimeAgo(r.timestamp)}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn btn-status" onClick={() => onView(r.id)} title="Detay">👁️ Detay</button>
                        {role === 'super_admin' && (
                          <button className="btn btn-delete" onClick={() => onDelete(r.id)} title="Sil">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};
