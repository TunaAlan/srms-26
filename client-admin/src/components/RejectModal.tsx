import React, { useState } from 'react';
import type { Report } from '../types';

interface RejectModalProps {
  report: Report;
  onClose: () => void;
  onBack?: () => void;
  onConfirm: (id: string, reason: string) => void;
}

export const RejectModal: React.FC<RejectModalProps> = ({ report, onClose, onBack, onConfirm }) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(report.id, reason.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Raporu Reddet</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="delete-confirm">
            <div className="delete-icon" style={{ background: 'var(--danger-bg)' }}>✕</div>
            <p className="delete-text">
              <strong>{report.categoryLabel}</strong> kategorisindeki bu raporu reddetmek istediğinizden emin misiniz?
            </p>
          </div>

          <div className="modal-section-title">RET SEBEBİ <span style={{ color: 'var(--danger)' }}>*</span></div>
          <textarea
            className="modal-textarea"
            placeholder="Reddetme sebebini açıklayın..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onBack ?? onClose}>{onBack ? '← Geri' : 'İptal'}</button>
          <button
            className="btn-delete-confirm"
            onClick={handleConfirm}
            disabled={!reason.trim()}
            style={{ opacity: reason.trim() ? 1 : 0.5, cursor: reason.trim() ? 'pointer' : 'not-allowed' }}
          >
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
};
