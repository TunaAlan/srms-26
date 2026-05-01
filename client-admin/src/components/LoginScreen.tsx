import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    onLogin(email, password);
  };

  return (
    <div id="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-badge">ABB</div>
          <h1>Yönetim Paneli</h1>
          <p>Altyapı Bildirim Sistemi</p>
          <span style={{ fontSize: '11px', opacity: 0.55, fontWeight: 400, letterSpacing: '0.4px' }}>
            v{__APP_VERSION__}
          </span>
        </div>

        {error && <div className="login-error" style={{ display: 'block' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>E-posta</label>
            <input
              type="email"
              placeholder="ad.soyad@ankara.bel.tr"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="login-field">
            <label>Şifre</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="login-btn"
            disabled={loading || !email || !password}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
};
