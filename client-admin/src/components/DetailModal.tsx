import React, { useState } from 'react';
import type { Report } from '../types';
import { getCriticalityLabel, getTimeAgo } from '../utils';

interface DetailModalProps {
  report: Report;
  onClose: () => void;
  onSave: (id: string, newStatus: string, newRes: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ report, onClose, onSave }) => {
  const [status, setStatus] = useState(report.status);
  const [resolution, setResolution] = useState(report.resolution || '');

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Bildirim Detayı #{report.id}</div>
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
              <div className="modal-info-label">Kategori</div>
              <div className="modal-info-value">{report.categoryLabel}</div>
            </div>
            <div className="modal-info-item">
              <div className="modal-info-label">Konum</div>
              <div className="modal-info-value">{report.address}</div>
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
              <div className="modal-info-label">Tarih</div>
              <div className="modal-info-value">{getTimeAgo(report.timestamp)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '12px 0' }}>
            <div>
              <div className="modal-section-title">Kullanıcı Kategorisi</div>
              <div className="modal-desc">
                {report.userCategory || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Seçilmedi</span>}
              </div>
            </div>
            <div>
              <div className="modal-section-title">AI Kategorisi</div>
              <div className="modal-desc">
                {report.categoryLabel || report.category || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Henüz analiz edilmedi</span>}
              </div>
            </div>
          </div>

          {report.userDescription && (
            <>
              <div className="modal-section-title">Kullanıcı Açıklaması</div>
              <div className="modal-desc">{report.userDescription}</div>
            </>
          )}

          {report.description && (
            <>
              <div className="modal-section-title">AI Açıklaması</div>
              <div className="modal-desc">{report.description}</div>
            </>
          )}

          <div className="modal-section-title">Durum Güncelle</div>
          <select 
            className="modal-status-select" 
            value={status} 
            onChange={(e) => setStatus(e.target.value as Report['status'])}
          >
            <option value="beklemede">⏳ Beklemede</option>
            <option value="inceleniyor">🔍 İnceleniyor</option>
            <option value="cozuldu">✅ Çözüldü</option>
          </select>

          <div className="modal-section-title">Sonuçlandırma Notu</div>
          <textarea 
            className="modal-textarea" 
            placeholder="Yapılan işlemi açıklayın..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>İptal</button>
          <button className="btn-save" onClick={() => onSave(report.id, status, resolution)}>Kaydet</button>
        </div>
      </div>
    </div>
  );
};
