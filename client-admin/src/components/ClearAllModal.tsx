import React, { useState } from 'react';

interface ClearAllModalProps {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ClearAllModal: React.FC<ClearAllModalProps> = ({ onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: '400px' }}>
        <div className="modal-header">
          <div className="modal-title">Tüm Raporları Sil</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="delete-confirm">
            <div className="delete-icon">✕</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Emin misiniz?</div>
            <div className="delete-text">
              Bu işlem <strong>geri alınamaz.</strong> Tüm raporlar ve ilgili görseller kalıcı olarak silinecek.
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>İptal</button>
          <button className="btn-delete-confirm" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Siliniyor...' : 'Tümünü Sil'}
          </button>
        </div>
      </div>
    </div>
  );
};
