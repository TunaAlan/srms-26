import React from 'react';
import type { Report } from '../types';
import {
  getCriticalityLabel,
  getTimeAgo,
  getCategoryLabel,
  getStatusLabel,
  getReviewStatusLabel,
  getForwardStatusLabel,
  getConfidenceLabel,
  getConfidenceColor,
} from '../utils';

interface DetailModalProps {
  report: Report;
  onClose: () => void;
  onViewOnMap?: (report: Report) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ report, onClose, onViewOnMap }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Bildirim Detayı <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500 }}>#{report.id.split('-')[0]}</span></div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <img
            src={report.image || ''}
            className="modal-image"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />

          <div className="modal-info-grid">
            <div className="modal-info-item">
              <div className="modal-info-label">Durum</div>
              <div className="modal-info-value">
                <span className={`badge badge-${report.status}`}>
                  {getStatusLabel(report.status)}
                </span>
              </div>
            </div>
            <div className="modal-info-item">
              <div className="modal-info-label">İnceleme</div>
              <div className="modal-info-value">
                <span className={`badge badge-review-${report.reviewStatus ?? 'pending'}`}>
                  {getReviewStatusLabel(report.reviewStatus)}
                </span>
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
              <div className="modal-info-label">AI Güven</div>
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
              <div className="modal-info-label">Tarih</div>
              <div className="modal-info-value">{getTimeAgo(report.timestamp)}</div>
            </div>
            {report.aiUnit && (
              <div className="modal-info-item" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div className="modal-info-label">Sorumlu Birim</div>
                <div className="modal-info-value">🏢 {report.aiUnit}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '12px 0' }}>
            <div>
              <div className="modal-section-title">AI KATEGORİSİ</div>
              <div className="modal-desc">{report.categoryLabel || '—'}</div>
            </div>
            <div>
              <div className="modal-section-title">KULLANICI KATEGORİSİ</div>
              <div className="modal-desc">
                {report.userCategory
                  ? getCategoryLabel(report.userCategory)
                  : <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Seçilmedi</span>}
              </div>
            </div>
          </div>

          {report.description && (
            <>
              <div className="modal-section-title">AI AÇIKLAMASI</div>
              <div className="modal-desc">{report.description}</div>
            </>
          )}

          {report.userDescription && (
            <>
              <div className="modal-section-title">KULLANICI AÇIKLAMASI</div>
              <div className="modal-desc">{report.userDescription}</div>
            </>
          )}

          {report.resolution && (
            <>
              <div className="modal-section-title">PERSONEL NOTU</div>
              <div className="modal-desc">{report.resolution}</div>
            </>
          )}

          {report.forwardStatus && (
            <>
              <div className="modal-section-title">İLETİM DURUMU</div>
              <div className="modal-desc">
                <span className={`badge badge-forward-${report.forwardStatus}`}>
                  {getForwardStatusLabel(report.forwardStatus)}
                </span>
                {report.forwardNote && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {report.forwardNote}
                  </div>
                )}
              </div>
            </>
          )}

          {report.rejectReason && (
            <>
              <div className="modal-section-title">RET SEBEBİ</div>
              <div className="modal-desc" style={{ color: 'var(--danger)' }}>{report.rejectReason}</div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
};
