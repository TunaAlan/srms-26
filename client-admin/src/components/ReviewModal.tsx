import React, { useState } from 'react';
import type { Report } from '../types';
import { CATEGORY_LABEL_MAP, getConfidenceLabel, getConfidenceColor } from '../utils';

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Kritik' },
  { value: 'high', label: 'Yüksek' },
  { value: 'medium', label: 'Orta' },
  { value: 'low', label: 'Düşük' },
];

const CATEGORY_TO_UNIT: Record<string, string> = {
  road_damage:      'Fen İşleri',
  sidewalk_damage:  'Fen İşleri',
  waste:            'Temizlik İşleri',
  pollution:        'Çevre Koruma',
  green_space:      'Park ve Bahçeler',
  lighting:         'Elektrik Birimi',
  traffic_sign:     'Trafik Birimi',
  sewage_water:     'Su ve Kanalizasyon',
  infrastructure:   'Fen İşleri',
  vandalism:        'Zabıta',
  stray_animal:     'Veteriner Birimi',
  natural_disaster: 'Afet Koordinasyon',
  normal:           '-',
  irrelevant:       '-',
};

interface ReviewModalProps {
  report: Report;
  onClose: () => void;
  onSave: (id: string, aiCategory: string, aiPriority: string, aiUnit: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ report, onClose, onSave }) => {
  const [category, setCategory] = useState(report.category);
  const unit = CATEGORY_TO_UNIT[category] ?? '-';
  const [priority, setPriority] = useState(() => {
    const c = report.criticality;
    if (c === 'kritik') return 'critical';
    if (c === 'yuksek') return 'high';
    if (c === 'orta') return 'medium';
    return 'low';
  });
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = () => {
    onSave(report.id, category, priority, unit);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Raporu Düzelt</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {showConfirm ? (
          <>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 32px', gap: '16px' }}>
              <div style={{ fontSize: '48px', lineHeight: 1 }}>✏️</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Düzeltmeyi Kaydet</div>
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
                Yaptığınız düzeltmeleri kaydetmek istediğinizden emin misiniz? Rapor, kaydedildikten sonra acil müdahale birimine yönlendirilecek.
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>📂 Kategori: <strong>{CATEGORY_LABEL_MAP[category] || category}</strong></div>
                <div>🏢 Birim: <strong>{unit}</strong></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowConfirm(false)}>← Geri Dön</button>
              <button className="btn-save" onClick={handleSave}>✏️ Düzeltmeyi Onayla</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              {report.image && (
                <img src={report.image} className="modal-image" alt="rapor görseli"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}

              {/* Kullanıcı bilgileri — sadece gösterim */}
              {(report.userDescription || report.userCategory) && (
                <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--review-bg)', borderRadius: '8px', borderLeft: '3px solid var(--review-color)' }}>
                  <div className="modal-section-title" style={{ color: 'var(--review-color)' }}>
                    KULLANICI BİLGİLERİ
                  </div>
                  {report.userCategory && (
                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                      <strong>Kategori:</strong> {CATEGORY_LABEL_MAP[report.userCategory] || report.userCategory}
                    </div>
                  )}
                  {report.userDescription && (
                    <div style={{ fontSize: '13px' }}>
                      <strong>Açıklama:</strong> {report.userDescription}
                    </div>
                  )}
                </div>
              )}

              <div className="modal-section-title">AI GÜVEN SKORU</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: getConfidenceColor(report.aiConfidence), marginBottom: '16px' }}>
                {getConfidenceLabel(report.aiConfidence)}
              </div>

              <div className="modal-section-title">AI KATEGORİ</div>
              <select
                className="modal-status-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {Object.entries(CATEGORY_LABEL_MAP).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>

              <div className="modal-section-title">BİRİM</div>
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginBottom: '16px',
              }}>
                🏢 {unit}
              </div>

              <div className="modal-section-title">ACİLİYET</div>
              <select
                className="modal-status-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>İptal</button>
              <button className="btn-save" onClick={() => setShowConfirm(true)}>Düzeltmeyi Kaydet</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
