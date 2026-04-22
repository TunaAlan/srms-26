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
  onForward?: (report: Report) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  reports,
  onViewReport,
  onInspect,
  onTabChange,
  role,
  onApprove,
  onReject,
  onForward,
}) => {
  const total = reports.length;
  const pending = reports.filter((r) => r.status === 'pending').length;
  const reviewing = reports.filter((r) => r.status === 'in_progress').length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;
  const criticalCount = reports.filter((r) => r.criticality === 'kritik').length;

  // Review stats
  const reviewPending = reports.filter((r) => r.reviewStatus === 'pending').length;
  const reviewApproved = reports.filter((r) => r.reviewStatus === 'approved').length;
  const reviewCorrected = reports.filter((r) => r.reviewStatus === 'corrected').length;
  const reviewRejected = reports.filter((r) => r.reviewStatus === 'rejected').length;
  const lowConfidencePending = reports.filter(
    (r) => r.reviewStatus === 'pending' && (r.aiConfidence ?? 1) < 0.60
  ).length;
  const criticalPending = reports.filter(
    (r) => r.reviewStatus === 'pending' && r.criticality === 'kritik'
  ).length;

  // Emergency stats
  const emergencyTotal = reports.filter(
    (r) => (r.criticality === 'kritik' || r.criticality === 'yuksek') &&
            r.reviewStatus !== 'pending' && r.reviewStatus !== 'rejected' &&
            r.forwardStatus !== 'completed'
  ).length;
  const forwardedCount = reports.filter((r) => r.forwardStatus === 'forwarded').length;
  const pendingForwardCount = reports.filter((r) => r.status === 'in_progress' && !r.forwardStatus).length;
  const completedCount = reports.filter((r) => r.forwardStatus === 'completed').length;
  const unforwardedCritical = reports.filter(
    (r) => r.criticality === 'kritik' &&
            r.status === 'in_progress' &&
            !r.forwardStatus
  ).length;

  // Tables
  const recentReports = [...reports]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const priorityPendingReports = reports
    .filter((r) => r.reviewStatus === 'pending')
    .sort((a, b) => (CRIT_ORDER[a.criticality] ?? 9) - (CRIT_ORDER[b.criticality] ?? 9))
    .slice(0, 8);

  const emergencyTableReports = reports
    .filter((r) =>
      (r.criticality === 'kritik' || r.criticality === 'yuksek') &&
      (r.status === 'in_progress' || r.status === 'resolved') &&
      r.forwardStatus !== 'completed'
    )
    .sort((a, b) => (CRIT_ORDER[a.criticality] ?? 9) - (CRIT_ORDER[b.criticality] ?? 9))
    .slice(0, 5);

  const badgeDot = (criticality: string) => {
    if (criticality === 'kritik') return 'var(--critical)';
    if (criticality === 'yuksek') return 'var(--high)';
    if (criticality === 'orta') return 'var(--medium)';
    return 'var(--low)';
  };

  return (
    <>
      {/* ───── SUPER ADMIN ───── */}
      {role === 'super_admin' && (
        <>
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-label">Toplam Bildirim</div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div
              onClick={() => onTabChange?.('review')}
              style={{ background: '#f3f0ff', border: '1px solid #c4b5fd', borderRadius: 'var(--radius)', padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ fontSize: '28px', lineHeight: 1 }}>🔍</div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.08em', marginBottom: '4px' }}>İNCELEME BİRİMİ</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{reviewPending}</span>
                  <span style={{ fontSize: '12px', color: '#a78bfa' }}>bekleyen rapor</span>
                </div>
              </div>
            </div>
            <div
              onClick={() => onTabChange?.('emergency')}
              style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,38,38,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ fontSize: '28px', lineHeight: 1 }}>🚨</div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', letterSpacing: '0.08em', marginBottom: '4px' }}>MÜDAHALE BİRİMİ</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{emergencyTotal}</span>
                  <span style={{ fontSize: '12px', color: '#f87171' }}>kritik rapor bekliyor</span>
                </div>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>SON 5 BİLDİRİM</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentReports.map((r) => (
              <div
                key={r.id}
                onClick={() => onViewReport(r.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <span className={`badge badge-${r.criticality}`} style={{ minWidth: '60px', textAlign: 'center' }}>
                  <span className="badge-dot" style={{ background: badgeDot(r.criticality) }}></span>{' '}
                  {getCriticalityLabel(r.criticality)}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px', minWidth: '110px' }}>{r.categoryLabel}</span>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</span>
                <span className={`badge badge-${r.status}`} style={{ minWidth: '72px', textAlign: 'center' }}>{getStatusLabel(r.status)}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{getTimeAgo(r.timestamp)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ───── REVIEW ───── */}
      {role === 'review' && (
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
                ÖNCELİKLİ BEKLEYEN {priorityPendingReports.length} BİLDİRİM
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
                          <div className="report-desc">{r.description}</div>
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

      {/* ───── EMERGENCY ───── */}
      {role === 'emergency' && (
        <>
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff1f2', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626', borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>
                {emergencyTotal === 0
                  ? 'Acil müdahale gerektiren rapor yok.'
                  : pendingForwardCount > 0
                    ? `${pendingForwardCount} kritik rapor henüz iletilmedi — toplam ${emergencyTotal} aktif acil rapor var.`
                    : `${emergencyTotal} aktif acil rapor takip altında — tüm raporlar iletildi.`}
              </div>
            </div>
            {emergencyTotal > 0 && (
              <button
                onClick={() => onTabChange?.('emergency')}
                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                🚨 Kuyruğa Git
              </button>
            )}
          </div>

          {/* KPI kartları */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card critical">
              <div className="stat-label">Acil Rapor</div>
              <div className="stat-number">{emergencyTotal}</div>
            </div>
            <div className="stat-card reviewing">
              <div className="stat-label">İletildi</div>
              <div className="stat-number">{forwardedCount}</div>
            </div>
            <div className="stat-card pending">
              <div className="stat-label">Bekliyor</div>
              <div className="stat-number">{pendingForwardCount}</div>
            </div>
            <div className="stat-card resolved">
              <div className="stat-label">Tamamlandı</div>
              <div className="stat-number">{completedCount}</div>
            </div>
          </div>

          {/* Risk sub-indicator */}
          {unforwardedCritical > 0 && (
            <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🔴</span>
              <div>
                <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>{unforwardedCritical} kritik rapor</span>
                <span style={{ color: '#991b1b', fontSize: '13px', marginLeft: '6px' }}>henüz ilgili birime iletilmedi</span>
              </div>
            </div>
          )}

          {/* Acil tablo */}
          {emergencyTableReports.length > 0 && (
            <>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>
                EN KRİTİK {emergencyTableReports.length} RAPOR
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fotoğraf</th>
                      <th>Açıklama / Konum</th>
                      <th>Kategori</th>
                      <th>Aciliyet</th>
                      <th>İletim</th>
                      <th>Zaman</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emergencyTableReports.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <img src={r.image || ''} className="report-image" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </td>
                        <td>
                          <div className="report-desc">{r.description}</div>
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
                          {r.forwardStatus ? (
                            <span className={`badge badge-forward-${r.forwardStatus}`}>{r.forwardStatus === 'forwarded' ? 'İletildi' : 'Tamamlandı'}</span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>İletilmedi</span>
                          )}
                        </td>
                        <td className="time-cell">{getTimeAgo(r.timestamp)}</td>
                        <td>
                          <button
                            className="btn btn-forward"
                            style={{ padding: '5px 10px', fontSize: '12px', opacity: r.forwardStatus === 'completed' ? 0.5 : 1 }}
                            onClick={() => onForward?.(r)}
                          >
                            {r.forwardStatus === 'completed' ? '📝 Not' : r.forwardStatus ? '🚨 Güncelle' : '🚨 İlet'}
                          </button>
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
