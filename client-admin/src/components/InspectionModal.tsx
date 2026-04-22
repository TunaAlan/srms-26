import React, { useState } from 'react';
import type { Report } from '../types';
import {
  getCriticalityLabel,
  getConfidenceLabel,
  getConfidenceColor,
  CATEGORY_LABEL_MAP,
  getTimeAgo,
} from '../utils';

interface InspectionModalProps {
  report: Report;
  role: string;
  onClose: () => void;
  onApprove: (id: string) => void;
  onCorrect: (report: Report) => void;
  onReject: (report: Report) => void;
  onViewOnMap?: (report: Report) => void;
}

type ConfirmAction = 'approve' | null;

const CONFIRM_CONFIG = {
  approve: {
    icon: '✅',
    title: 'Raporu Onayla',
    message: 'Bu raporu onaylamak istediğinizden emin misiniz? Rapor acil müdahale birimine yönlendirilecek.',
    confirmLabel: '✓ Onayla',
    confirmClass: 'btn btn-approve',
  },
};

export const InspectionModal: React.FC<InspectionModalProps> = ({
  report,
  role,
  onClose,
  onApprove,
  onCorrect,
  onReject,
  onViewOnMap,
}) => {
  const [pendingAction, setPendingAction] = useState<ConfirmAction>(null);

  const handleCorrect = () => {
    onCorrect(report);
    onClose();
  };

  const handleReject = () => {
    onReject(report);
    onClose();
  };

  const executeAction = () => {
    if (pendingAction === 'approve') {
      onApprove(report.id);
      onClose();
    }
    setPendingAction(null);
  };

  let badgeDotColor = 'var(--low)';
  if (report.criticality === 'kritik') badgeDotColor = 'var(--critical)';
  else if (report.criticality === 'yuksek') badgeDotColor = 'var(--high)';
  else if (report.criticality === 'orta') badgeDotColor = 'var(--medium)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Rapor İnceleme</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* ---- Onay Ekranı ---- */}
        {pendingAction ? (() => {
          const cfg = CONFIRM_CONFIG[pendingAction];
          return (
            <>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 32px', gap: '16px' }}>
                <div style={{ fontSize: '48px', lineHeight: 1 }}>{cfg.icon}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{cfg.title}</div>
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 20px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  maxWidth: '420px',
                }}>
                  {cfg.message}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  Rapor: <strong>"{report.description.substring(0, 50)}..."</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setPendingAction(null)}>← Geri Dön</button>
                <button className={cfg.confirmClass} style={{ padding: '8px 20px' }} onClick={executeAction}>
                  {cfg.confirmLabel}
                </button>
              </div>
            </>
          );
        })() : (
          <>
            <div className="modal-body">
              {/* Fotoğraf */}
              {report.image && (
                <img
                  src={report.image}
                  className="modal-image"
                  alt="rapor görseli"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}

              {/* Üst bilgi satırı */}
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <div className="modal-info-label">Aciliyet</div>
                  <div className="modal-info-value">
                    <span className={`badge badge-${report.criticality}`}>
                      <span className="badge-dot" style={{ background: badgeDotColor }}></span>{' '}
                      {getCriticalityLabel(report.criticality)}
                    </span>
                  </div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">AI Güven Skoru</div>
                  <div className="modal-info-value" style={{ fontWeight: 700, color: getConfidenceColor(report.aiConfidence) }}>
                    {getConfidenceLabel(report.aiConfidence)}
                  </div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Zaman</div>
                  <div className="modal-info-value">{getTimeAgo(report.timestamp)}</div>
                </div>
                <div
                  className="modal-info-item"
                  onClick={() => {
                    if (report.latitude && report.longitude && onViewOnMap) {
                      onViewOnMap(report);
                      onClose();
                    }
                  }}
                  style={{
                    cursor: report.latitude && report.longitude ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  title={report.latitude && report.longitude ? 'Haritada Gör' : 'Konum bilgisi yok'}
                  onMouseEnter={(e) => {
                    if (report.latitude && report.longitude) {
                      (e.currentTarget as HTMLDivElement).style.background = '#e8f0fe';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = '';
                  }}
                >
                  <div className="modal-info-label">Konum</div>
                  <div className="modal-info-value">
                    {report.latitude && report.longitude
                      ? <span style={{ color: '#005BAA', fontWeight: 600 }}>🗺️ Haritada Gör</span>
                      : <span>📍 {report.address || '—'}</span>
                    }
                  </div>
                </div>
                <div className="modal-info-item" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div className="modal-info-label">Sorumlu Birim</div>
                  <div className="modal-info-value">🏢 {report.aiUnit || '—'}</div>
                </div>
              </div>

              {/* Kategori karşılaştırması */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                  <div className="modal-section-title" style={{ color: 'var(--primary)' }}>AI KATEGORİ</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                    {report.categoryLabel || '—'}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', borderLeft: '3px solid var(--review-color)' }}>
                  <div className="modal-section-title" style={{ color: 'var(--review-color)' }}>KULLANICI KATEGORİSİ</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--review-color)' }}>
                    {report.userCategory ? (CATEGORY_LABEL_MAP[report.userCategory] || report.userCategory) : '—'}
                  </div>
                </div>
              </div>

              {/* Açıklama karşılaştırması */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div className="modal-section-title">AI AÇIKLAMASI</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {report.description || '—'}
                  </p>
                </div>
                <div>
                  <div className="modal-section-title">KULLANICI AÇIKLAMASI</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {report.userDescription || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>Kapat</button>
              {role === 'review' && (
                <>
                  <button className="btn btn-reject" style={{ padding: '8px 16px' }} onClick={handleReject}>✕ Reddet</button>
                  <button className="btn btn-correct" style={{ padding: '8px 16px' }} onClick={handleCorrect}>✏️ Düzelt</button>
                  <button className="btn btn-approve" style={{ padding: '8px 16px' }} onClick={() => setPendingAction('approve')}>✓ Onayla</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
