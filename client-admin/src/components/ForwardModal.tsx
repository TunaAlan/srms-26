import React, { useState } from 'react';
import type { Report } from '../types';
import { getCriticalityLabel } from '../utils';

const FORWARD_STATUS_OPTIONS = [
  { value: 'forwarded',  label: 'İletildi' },
  { value: 'completed',  label: 'Tamamlandı' },
];

interface ForwardModalProps {
  report: Report;
  onClose: () => void;
  onSave: (id: string, forwardStatus: string, forwardNote: string) => void;
  onViewOnMap?: (report: Report) => void;
  readOnly?: boolean;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ report, onClose, onSave, onViewOnMap, readOnly = false }) => {
  const [forwardStatus, setForwardStatus] = useState<string>(
    report.forwardStatus ?? 'forwarded'
  );
  const [forwardNote, setForwardNote] = useState(report.forwardNote ?? '');

  const handleSave = () => {
    onSave(report.id, forwardStatus, forwardNote);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Acil İletim</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {report.image && (
            <img
              src={report.image}
              className="modal-image"
              alt="rapor görseli"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          <div className="modal-info-grid">
            <div className="modal-info-item">
              <div className="modal-info-label">Kategori</div>
              <div className="modal-info-value">{report.categoryLabel}</div>
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
              <div className="modal-info-label">Birim</div>
              <div className="modal-info-value">🏢 {report.aiUnit || '—'}</div>
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
                if (report.latitude && report.longitude)
                  (e.currentTarget as HTMLDivElement).style.background = '#e8f0fe';
              }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
            >
              <div className="modal-info-label">Konum</div>
              <div className="modal-info-value">
                {report.latitude && report.longitude
                  ? <span style={{ color: '#005BAA', fontWeight: 600 }}>🗺️ Haritada Gör</span>
                  : <span>📍 {report.address || '—'}</span>
                }
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)', borderRadius: '8px' }}>
              <div className="modal-section-title" style={{ marginBottom: '6px' }}>AI AÇIKLAMASI</div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {report.description || '—'}
              </p>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: '3px solid var(--review-color)', borderRadius: '8px' }}>
              <div className="modal-section-title" style={{ marginBottom: '6px', color: 'var(--review-color)' }}>KULLANICI AÇIKLAMASI</div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {report.userDescription || '—'}
              </p>
            </div>
          </div>

          <div className="modal-section-title">İLETİM DURUMU</div>
          {readOnly || report.forwardStatus === 'completed' ? (
            <div style={{
              padding: '8px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
            }}>
              ✅ Tamamlandı
            </div>
          ) : (
            <select
              className="modal-status-select"
              value={forwardStatus}
              onChange={(e) => setForwardStatus(e.target.value)}
            >
              {FORWARD_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}

          <div className="modal-section-title">MÜDAHALE NOTU</div>
          <textarea
            className="modal-textarea"
            placeholder={readOnly ? '—' : 'İlgili birime iletilecek not veya talimat...'}
            value={forwardNote}
            onChange={(e) => !readOnly && setForwardNote(e.target.value)}
            rows={4}
            readOnly={readOnly}
            style={readOnly ? { background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'default', resize: 'none' } : {}}
          />
        </div>

        <div className="modal-footer">
          {readOnly ? (
            <button className="btn-save" style={{ background: 'var(--primary)' }} onClick={onClose}>Kapat</button>
          ) : (
            <>
              <button className="btn-cancel" onClick={onClose}>İptal</button>
              <button
                className="btn-save"
                style={{
                  background: forwardNote.trim() ? 'var(--emergency-color)' : 'var(--border)',
                  cursor: forwardNote.trim() ? 'pointer' : 'not-allowed',
                }}
                onClick={handleSave}
                disabled={!forwardNote.trim()}
              >
                🚨 İlet
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
