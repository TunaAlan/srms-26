import React, { useState } from 'react';
import type { StaffUser } from '../types';

interface PersonnelPanelProps {
  staff: StaffUser[];
  currentUserId: string;
  onAdd: (data: { name: string; email: string; password: string; role: string }) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  review_personnel: 'İnceleme Personeli',
};

export const PersonnelPanel: React.FC<PersonnelPanelProps> = ({ staff, currentUserId, onAdd, onToggleActive, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !password.trim() || !passwordConfirm.trim()) {
      setError('Tüm alanları doldurun.');
      return;
    }
    if (!/^[^\s@]+@ankara\.bel\.tr$/.test(email.trim())) {
      setError('E-posta @ankara.bel.tr uzantılı olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    onAdd({ name, email, password, role: 'review_personnel' });
    setName(''); setEmail(''); setPassword(''); setPasswordConfirm(''); setError('');
    setShowForm(false);
  };

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>PERSONEL YÖNETİMİ</h3>
        <button className="btn btn-approve" style={{ padding: '8px 16px' }} onClick={() => setShowForm((v) => !v)}>
          + Personel Ekle
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div className="modal-section-title">İSİM SOYİSİM</div>
              <input
                type="text"
                className="filter-search"
                placeholder="Ad Soyad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div className="modal-section-title">E-POSTA</div>
              <input
                type="email"
                className="filter-search"
                placeholder="ad.soyad@ankara.bel.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div className="modal-section-title">ŞİFRE</div>
              <input
                type="password"
                className="filter-search"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div className="modal-section-title">ŞİFRE ONAY</div>
              <input
                type="password"
                className="filter-search"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          {error && <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '8px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn-cancel" onClick={() => { setShowForm(false); setError(''); }}>İptal</button>
            <button className="btn btn-approve" style={{ padding: '8px 20px' }} onClick={handleSubmit}>Kaydet</button>
          </div>
        </div>
      )}

      <div className="table-container">
        {staff.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Personel Bulunamadı</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>İsim Soyisim</th>
                <th>E-posta</th>
                <th>Yetki</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.name}
                      {isSelf && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '6px' }}>(siz)</span>}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: u.role === 'admin' ? 'var(--danger)' : 'var(--primary)' }}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-resolved' : 'badge-rejected'}`}>
                        {u.isActive ? 'Aktif' : 'Askıda'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className={`btn ${u.isActive ? 'btn-reject' : 'btn-approve'}`}
                          style={{ padding: '5px 10px', fontSize: '12px', opacity: isSelf ? 0.3 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                          onClick={() => !isSelf && onToggleActive(u.id, !u.isActive)}
                          disabled={isSelf}
                          title={isSelf ? 'Kendi hesabınızı askıya alamazsınız' : undefined}
                        >
                          {u.isActive ? 'Askıya Al' : 'Aktifleştir'}
                        </button>
                        <button
                          className="btn btn-delete"
                          style={{ padding: '5px 10px', fontSize: '12px', opacity: isSelf ? 0.3 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                          onClick={() => !isSelf && setDeleteTarget(u)}
                          disabled={isSelf}
                          title={isSelf ? 'Kendi hesabınızı silemezsiniz' : undefined}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ width: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Personeli Sil</div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirm">
                <div className="delete-icon">✕</div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Emin misiniz?</div>
                <div className="delete-text">
                  <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) adlı personel kalıcı olarak silinecek.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>İptal</button>
              <button className="btn-delete-confirm" onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
