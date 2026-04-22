import React, { useState } from 'react';
import type { Report } from '../types';
import {
  getTimeAgo,
  getCriticalityLabel,
  getConfidenceLabel,
  getConfidenceColor,
  CATEGORY_LABEL_MAP,
} from '../utils';
import { InspectionModal } from './InspectionModal';

const CONFIDENCE_THRESHOLD = 0.60;

type ConfidenceFilter = 'low' | 'high';
type SortKey = 'category' | 'criticality' | 'confidence' | 'timestamp';
type SortDir = 'asc' | 'desc';

const CRIT_ORDER: Record<string, number> = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };

interface ReviewQueueProps {
  reports: Report[];
  role: string;
  onApprove: (id: string) => void;
  onCorrect: (report: Report) => void;
  onReject: (report: Report) => void;
  onViewOnMap?: (report: Report) => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  reports,
  role,
  onApprove,
  onCorrect,
  onReject,
  onViewOnMap,
}) => {
  const [confidenceFilter, setConfidenceFilterState] = useState<ConfidenceFilter>(
    () => (sessionStorage.getItem('rq_confidence') as ConfidenceFilter) || 'high'
  );
  const setConfidenceFilter = (v: ConfidenceFilter) => {
    sessionStorage.setItem('rq_confidence', v);
    setConfidenceFilterState(v);
  };

  const [filterCategory, setFilterCategoryState] = useState<string>(
    () => sessionStorage.getItem('rq_category') || 'all'
  );
  const setFilterCategory = (v: string) => {
    sessionStorage.setItem('rq_category', v);
    setFilterCategoryState(v);
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCriticality, setFilterCriticality] = useState('all');
  const [inspectTarget, setInspectTarget] = useState<Report | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('criticality');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'timestamp' ? 'desc' : 'asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: '#7c3aed' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  const pending = reports.filter((r) => r.reviewStatus === 'pending');
  const lowCount = pending.filter((r) => (r.aiConfidence ?? 1) < CONFIDENCE_THRESHOLD).length;
  const highCount = pending.filter((r) => (r.aiConfidence ?? 0) >= CONFIDENCE_THRESHOLD).length;

  const filteredQueue = pending.filter((r) => {
    // 1. Güven skoru filtresi
    const passesConfidence = confidenceFilter === 'low'
      ? (r.aiConfidence ?? 1) < CONFIDENCE_THRESHOLD
      : (r.aiConfidence ?? 0) >= CONFIDENCE_THRESHOLD;

    if (!passesConfidence) return false;

    // 2. Kategori filtresi
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;

    // 3. Aciliyet filtresi
    if (filterCriticality !== 'all' && r.criticality !== filterCriticality) return false;

    // 3. Arama filtresi
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (r.description || '').toLowerCase().includes(q) ||
        (r.address || '').toLowerCase().includes(q) ||
        (r.categoryLabel || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const queue = [...filteredQueue].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'category')    cmp = a.categoryLabel.localeCompare(b.categoryLabel, 'tr');
    if (sortKey === 'criticality') cmp = (CRIT_ORDER[a.criticality] ?? 9) - (CRIT_ORDER[b.criticality] ?? 9);
    if (sortKey === 'confidence')  cmp = (a.aiConfidence ?? 0) - (b.aiConfidence ?? 0);
    if (sortKey === 'timestamp')   cmp = a.timestamp - b.timestamp;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const BANNER = (
    <div style={{
      background: '#f5f3ff',
      border: '1px solid #ddd6fe',
      borderLeft: '4px solid #7c3aed',
      borderRadius: '8px',
      padding: '14px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ fontSize: '18px' }}>🔍</span>
      <div>
        <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: '15px' }}>İnceleme Kuyruğu</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '10px' }}>
          Tüm bekleyen raporlar — güven skoruna göre sıralanmış
        </span>
      </div>
    </div>
  );

  if (pending.length === 0) {
    return (
      <>
        {BANNER}
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ fontSize: '15px', fontWeight: 600 }}>İnceleme kuyruğu boş</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Tüm raporlar incelendi.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {BANNER}

      <div className="filters-bar">
        <span className="filter-label">Güven:</span>
        {(['low', 'high'] as ConfidenceFilter[]).map((f) => {
          const isActive = confidenceFilter === f;
          const label = f === 'low' ? 'Düşük (<60%)' : 'Yüksek (≥60%)';
          const count = f === 'low' ? lowCount : highCount;
          return (
            <button
              key={f}
              onClick={() => setConfidenceFilter(f)}
              className={isActive ? 'filter-toggle-active' : 'filter-toggle'}
            >
              {label}
              <span className="filter-toggle-badge">{count}</span>
            </button>
          );
        })}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="filter-select" value={filterCriticality} onChange={(e) => setFilterCriticality(e.target.value)}>
            <option value="all">Tüm Aciliyetler</option>
            <option value="kritik">Kritik</option>
            <option value="yuksek">Yüksek</option>
            <option value="orta">Orta</option>
            <option value="dusuk">Düşük</option>
          </select>
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
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

          <input
            type="text"
            className="filter-search"
            placeholder="🔍 Ara... (adres, açıklama)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Fotoğraf</th>
              <th>Açıklama / Konum</th>
              <th style={thStyle} onClick={() => handleSort('category')}>Kategori <SortIcon col="category" /></th>
              <th style={thStyle} onClick={() => handleSort('criticality')}>Aciliyet <SortIcon col="criticality" /></th>
              <th style={thStyle} onClick={() => handleSort('confidence')}>Güven <SortIcon col="confidence" /></th>
              <th style={thStyle} onClick={() => handleSort('timestamp')}>Zaman <SortIcon col="timestamp" /></th>
            </tr>
          </thead>
          <tbody>
            {queue.map((r) => {
              let badgeDotColor = 'var(--low)';
              if (r.criticality === 'kritik') badgeDotColor = 'var(--critical)';
              else if (r.criticality === 'yuksek') badgeDotColor = 'var(--high)';
              else if (r.criticality === 'orta') badgeDotColor = 'var(--medium)';

              return (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setInspectTarget(r)}>
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
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>
                      {r.categoryLabel}
                    </div>
                    {r.userCategory && (
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {CATEGORY_LABEL_MAP[r.userCategory] || r.userCategory}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${r.criticality}`}>
                      <span className="badge-dot" style={{ background: badgeDotColor }}></span>{' '}
                      {getCriticalityLabel(r.criticality)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: getConfidenceColor(r.aiConfidence) }}>
                      {getConfidenceLabel(r.aiConfidence)}
                    </span>
                    <div className="confidence-bar-wrap">
                      <div
                        className="confidence-bar-fill"
                        style={{
                          width: `${Math.round((r.aiConfidence ?? 0) * 100)}%`,
                          background: getConfidenceColor(r.aiConfidence),
                        }}
                      />
                    </div>
                  </td>
                  <td className="time-cell">{getTimeAgo(r.timestamp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inspectTarget && (
        <InspectionModal
          report={inspectTarget}
          role={role}
          onClose={() => setInspectTarget(null)}
          onApprove={onApprove}
          onCorrect={onCorrect}
          onReject={onReject}
          onViewOnMap={onViewOnMap}
        />
      )}
    </>
  );
};
