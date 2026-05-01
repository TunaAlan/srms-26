import React from 'react';
import type { Report, UserRole, TabState } from '../types';
import {
  getTimeAgo,
  getStatusLabel,
  getCriticalityLabel,
  getConfidenceLabel,
  getConfidenceColor,
} from '../utils';

const CRIT_ORDER: Record<string, number> = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };

interface DashboardProps {
  reports: Report[];
  onViewReport: (id: string) => void;
  onInspect?: (report: Report) => void;
  onTabChange?: (tab: TabState) => void;
  role: UserRole;
  onApprove?: (id: string) => void;
  onReject?: (report: Report) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  reports,
  onViewReport,
  onInspect,
  onTabChange,
  role,
  onApprove,
  onReject,
}) => {
  const total = reports.length;
  const pending = reports.filter((r) => r.status === 'pending').length;
  const reviewing = reports.filter((r) => r.status === 'in_progress').length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;
  const criticalCount = reports.filter((r) => r.criticality === 'kritik').length;

  // Review stats
  const reviewPending = reports.filter((r) => r.status === 'in_review').length;
  const reviewApproved = reports.filter((r) => r.reviewStatus === 'approved').length;
  const reviewCorrected = reports.filter((r) => r.reviewStatus === 'corrected').length;
  const reviewRejected = reports.filter((r) => r.reviewStatus === 'rejected').length;
  const lowConfidencePending = reports.filter(
    (r) => r.status === 'in_review' && (r.aiConfidence ?? 1) < 0.60
  ).length;
  const criticalPending = reports.filter(
    (r) => r.status === 'in_review' && r.criticality === 'kritik'
  ).length;

  // Tables
  const recentReports = [...reports]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  // Kategori dağılımı
  const categoryMap: Record<string, number> = {};
  reports.forEach((r) => {
    if (r.status === 'pending') return;
    const label = r.categoryLabel || 'Diğer';
    categoryMap[label] = (categoryMap[label] || 0) + 1;
  });
  const categoryDist = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCount = categoryDist[0]?.[1] ?? 1;

  const priorityPendingReports = reports
    .filter((r) => r.status === 'in_review')
    .sort((a, b) => (CRIT_ORDER[a.criticality] ?? 9) - (CRIT_ORDER[b.criticality] ?? 9))
    .slice(0, 8);

  const badgeDot = (criticality: string) => {
    if (criticality === 'kritik') return 'var(--critical)';
    if (criticality === 'yuksek') return 'var(--high)';
    if (criticality === 'orta') return 'var(--medium)';
    return 'var(--low)';
  };

  return (
    <>
      {/* ───── ADMIN ───── */}
      {role === 'admin' && (
        <>
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-label">Toplam Rapor</div>
              <div className="stat-number">{total}</div>
            </div>
            <div className="stat-card pending">
              <div className="stat-label">Beklemede</div>
              <div className="stat-number">{pending}</div>
            </div>
            <div className="stat-card reviewing">
              <div className="stat-label">İşlemde</div>
              <div className="stat-number">{reviewing}</div>
            </div>
            <div className="stat-card resolved">
              <div className="stat-label">Çözüldü</div>
              <div className="stat-number">{resolved}</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-label">Kritik</div>
              <div className="stat-number">{criticalCount}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
            <div
              onClick={() => onTabChange?.('review')}
              style={{ background: '#f3f0ff', border: '1px solid #c4b5fd', borderRadius: 'var(--radius)', padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ fontSize: '28px', lineHeight: 1 }}>🔍</div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.08em', marginBottom: '4px' }}>İNCELEME KUYRUĞU</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{reviewPending}</span>
                  <span style={{ fontSize: '12px', color: '#a78bfa' }}>bekleyen rapor</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>SON 5 RAPOR</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fotoğraf</th>
                      <th>Açıklama / Konum</th>
                      <th>Kategori</th>
                      <th>Durum</th>
                      <th>Aciliyet</th>
                      <th>Zaman</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map((r) => (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onViewReport(r.id)}>
                        <td>
                          <img src={r.image || ''} className="report-image" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </td>
                        <td>
                          <div className="report-desc" style={!r.description ? { color: 'var(--text-tertiary)', fontStyle: 'italic' } : undefined}>
                            {r.description || 'Analiz bekleniyor...'}
                          </div>
                          <div className="report-address">
                            {r.address && <span>📍 {r.address}</span>}
                            {r.aiUnit && <span style={{ marginLeft: r.address ? '8px' : '0' }}>🏢 {r.aiUnit}</span>}
                          </div>
                        </td>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>{r.categoryLabel}</span></td>
                        <td><span className={`badge badge-${r.status}`}>{getStatusLabel(r.status)}</span></td>
                        <td>
                          <span className={`badge badge-${r.criticality}`}>
                            <span className="badge-dot" style={{ background: badgeDot(r.criticality) }}></span>{' '}
                            {getCriticalityLabel(r.criticality)}
                          </span>
                        </td>
                        <td className="time-cell">{getTimeAgo(r.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>KATEGORİ DAĞILIMI</h3>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categoryDist.map(([label, count]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{count} ({Math.round(count / total * 100)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: 'var(--primary)', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ───── REVIEW PERSONNEL ───── */}
      {role === 'review_personnel' && (
        <>
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f3f0ff', border: '1px solid #c4b5fd', borderLeft: '4px solid #7c3aed', borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#7c3aed' }}>
                {reviewPending > 0
                  ? `Kuyrukta incelenmeyi bekleyen ${reviewPending} raporunuz var.`
                  : 'İnceleme kuyruğu boş — tüm raporlar incelendi.'}
              </div>
            </div>
            {reviewPending > 0 && (
              <button
                onClick={() => onTabChange?.('review')}
                style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                🔍 İncelemeye Başla
              </button>
            )}
          </div>

          {/* KPI kartları */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card pending">
              <div className="stat-label">İnceleme Bekliyor</div>
              <div className="stat-number">{reviewPending}</div>
            </div>
            <div className="stat-card resolved">
              <div className="stat-label">Onaylandı</div>
              <div className="stat-number">{reviewApproved}</div>
            </div>
            <div className="stat-card reviewing">
              <div className="stat-label">Düzeltildi</div>
              <div className="stat-number">{reviewCorrected}</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-label">Reddedildi</div>
              <div className="stat-number">{reviewRejected}</div>
            </div>
          </div>

          {/* Risk sub-indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', letterSpacing: '0.06em' }}>DÜŞÜK GÜVEN SKORLU</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>{lowConfidencePending}</div>
                <div style={{ fontSize: '11px', color: '#92400e' }}>bekleyen rapor (&lt;%60)</div>
              </div>
            </div>
            <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🔥</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', letterSpacing: '0.06em' }}>KRİTİK ACİLİYETLİ</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>{criticalPending}</div>
                <div style={{ fontSize: '11px', color: '#991b1b' }}>bekleyen rapor</div>
              </div>
            </div>
          </div>

          {/* Öncelikli tablo */}
          {priorityPendingReports.length > 0 && (
            <>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
                ÖNCELİKLİ BEKLEYEN {priorityPendingReports.length} RAPOR
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fotoğraf</th>
                      <th>Açıklama / Konum</th>
                      <th>Kategori</th>
                      <th>Aciliyet</th>
                      <th>Güven</th>
                      <th>Zaman</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityPendingReports.map((r) => (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onInspect?.(r)}>
                        <td>
                          <img src={r.image || ''} className="report-image" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </td>
                        <td>
                          <div className="report-desc" style={!r.description ? { color: 'var(--text-tertiary)', fontStyle: 'italic' } : undefined}>
                            {r.description || 'Analiz bekleniyor...'}
                          </div>
                          <div className="report-address">
                            {r.address && <span>📍 {r.address}</span>}
                            {r.aiUnit && <span style={{ marginLeft: r.address ? '8px' : '0' }}>🏢 {r.aiUnit}</span>}
                          </div>
                        </td>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>{r.categoryLabel}</span></td>
                        <td>
                          <span className={`badge badge-${r.criticality}`}>
                            <span className="badge-dot" style={{ background: badgeDot(r.criticality) }}></span>{' '}
                            {getCriticalityLabel(r.criticality)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: getConfidenceColor(r.aiConfidence) }}>
                            {getConfidenceLabel(r.aiConfidence)}
                          </span>
                        </td>
                        <td className="time-cell">{getTimeAgo(r.timestamp)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="actions-cell">
                            <button className="btn btn-approve" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => onApprove?.(r.id)}>✓ Onayla</button>
                            <button className="btn btn-reject" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => onReject?.(r)}>✕ Reddet</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

    </>
  );
};
