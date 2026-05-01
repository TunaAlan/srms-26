import React, { useState, useRef, useEffect } from 'react';
import type { Report } from '../types';
import { PhotoLightbox } from './PhotoLightbox';
import {
  getCriticalityLabel,
  getTimeAgo,
  getStatusLabel,
  getReviewStatusLabel,
  getConfidenceLabel,
  getConfidenceColor,
  CATEGORY_LABEL_MAP,
} from '../utils';

interface DetailModalProps {
  report: Report;
  role?: string;
  onClose: () => void;
  onViewOnMap?: (report: Report) => void;
  onChangeStatus?: (id: string, status: 'in_review' | 'in_progress' | 'resolved', note?: string) => void;
  onReject?: (report: Report) => void;
}

const STATUS_TRANSITIONS: Record<string, { label: string; value: 'in_review' | 'in_progress' | 'resolved' }[]> = {
  rejected:    [{ label: 'Tekrar İncelemeye Al', value: 'in_review' }],
  in_progress: [
    { label: 'Çözüldü', value: 'resolved' },
    { label: 'Tekrar İncelemeye Al', value: 'in_review' },
  ],
};

export const DetailModal: React.FC<DetailModalProps> = ({ report, role, onClose, onViewOnMap, onChangeStatus, onReject }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'in_review' | 'in_progress' | 'resolved' | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const transitions = STATUS_TRANSITIONS[report.status] ?? [];
  const canChangeStatus = role === 'admin' && onChangeStatus && transitions.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Rapor Detayı <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500 }}>#{report.id.split('-')[0]}</span></div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {report.image && <PhotoLightbox src={report.image} />}

          <div className="modal-info-grid">
            <div className="modal-info-item" ref={dropdownRef} style={{ position: 'relative' }}>
              <div className="modal-info-label">Durum</div>
              <div className="modal-info-value">
                <span
                  className={`badge badge-${report.status}`}
                  style={canChangeStatus ? { cursor: 'pointer', userSelect: 'none' } : {}}
                  onClick={() => canChangeStatus && setDropdownOpen((o) => !o)}
                  title={canChangeStatus ? 'Durumu değiştir' : undefined}
                >
                  {getStatusLabel(report.status)}{canChangeStatus ? ' ▾' : ''}
                </span>
                {dropdownOpen && !pendingStatus && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: '160px', overflow: 'hidden' }}>
                    {transitions.map((t) => (
                      <div
                        key={t.value}
                        onClick={() => { setPendingStatus(t.value); setDropdownOpen(false); }}
                        style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        {t.value === 'in_progress' ? '↩' : ''} {t.label}
                      </div>
                    ))}
                  </div>
                )}
                {pendingStatus && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: '220px', padding: '10px' }}>
                    <textarea
                      placeholder="Not ekle (isteğe bağlı)..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      rows={3}
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '6px', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button
                        onClick={() => { setPendingStatus(null); setStatusNote(''); }}
                        style={{ flex: 1, padding: '6px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', background: '#fff' }}
                      >
                        Vazgeç
                      </button>
                      <button
                        onClick={() => { onChangeStatus!(report.id, pendingStatus, statusNote || undefined); setPendingStatus(null); setStatusNote(''); onClose(); }}
                        style={{ flex: 1, padding: '6px', fontSize: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'var(--primary)', color: '#fff', fontWeight: 600 }}
                      >
                        Onayla
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-info-item">
              <div className="modal-info-label">İnceleme</div>
              <div className="modal-info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`badge badge-review-${report.reviewStatus ?? 'pending'}`}>
                  {getReviewStatusLabel(report.reviewStatus)}
                </span>
                {report.reviewedByName && (
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    👤 {report.reviewedByName}
                  </span>
                )}
              </div>
            </div>
            <div className="modal-info-item">
              <div className="modal-info-label">Aciliyet</div>
              <div className="modal-info-value">
                <span className={`badge badge-${report.criticality}`}>
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
            <div
              className="modal-info-item"
              onClick={() => {
                if (report.latitude && report.longitude && onViewOnMap) {
                  onViewOnMap(report);
                  onClose();
                }
              }}
              style={{ cursor: report.latitude && report.longitude ? 'pointer' : 'default', transition: 'background 0.15s' }}
              title={report.latitude && report.longitude ? 'Haritada Gör' : 'Konum bilgisi yok'}
              onMouseEnter={(e) => {
                if (report.latitude && report.longitude)
                  (e.currentTarget as HTMLDivElement).style.background = '#e8f0fe';
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
            <div className="modal-info-item">
              <div className="modal-info-label">Zaman</div>
              <div className="modal-info-value">{getTimeAgo(report.timestamp)}</div>
            </div>
            {report.aiUnit && (
              <div className="modal-info-item" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div className="modal-info-label">Sorumlu Birim</div>
                <div className="modal-info-value">🏢 {report.aiUnit}</div>
              </div>
            )}
          </div>

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

          {report.resolution && (
            <div style={{ marginTop: '12px', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', borderRadius: '8px' }}>
              <div className="modal-section-title" style={{ color: '#92400e', marginBottom: '4px' }}>PERSONEL NOTU</div>
              <p style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.5, margin: 0 }}>{report.resolution}</p>
            </div>
          )}

          {report.rejectReason && (
            <div style={{ marginTop: '12px', padding: '12px 16px', background: '#fff1f2', border: '1px solid #fca5a5', borderLeft: '3px solid var(--danger)', borderRadius: '8px' }}>
              <div className="modal-section-title" style={{ color: 'var(--danger)', marginBottom: '4px' }}>RET SEBEBİ</div>
              <p style={{ fontSize: '13px', color: 'var(--danger)', lineHeight: 1.5, margin: 0 }}>{report.rejectReason}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Kapat</button>
          {role === 'admin' && report.status === 'in_progress' && onReject && (
            <button className="btn btn-reject" style={{ padding: '8px 16px' }} onClick={() => { onClose(); onReject(report); }}>
              ✕ Reddet
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
