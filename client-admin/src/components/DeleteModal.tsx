import React from 'react';
import type { Report } from '../types';

interface DeleteModalProps {
  report: Report;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ report, onClose, onConfirm }) => {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: '400px' }}>
        <div className="modal-header">
          <div className="modal-title">Raporu Sil</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="delete-confirm">
            <div className="delete-icon">✕</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Emin misiniz?</div>
            <div className="delete-text">
              "{report.description.substring(0, 60)}..." raporu kalıcı olarak silinecek.
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>İptal</button>
          <button className="btn-delete-confirm" onClick={() => onConfirm(report.id)}>Sil</button>
        </div>
      </div>
    </div>
  );
};
