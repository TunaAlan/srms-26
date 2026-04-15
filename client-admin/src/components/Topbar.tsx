import React, { useState, useRef, useEffect } from 'react';

interface TopbarProps {
  pendingCount: number;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ pendingCount, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">ABB</div>
        <div className="topbar-divider"></div>
        <div className="topbar-title">Altyapı Yönetim Paneli</div>
      </div>
      <div className="topbar-right">
        {pendingCount > 0 && <span className="topbar-badge">{pendingCount} bekleyen</span>}
        <div className="user-menu" ref={menuRef} id="user-menu">
          <button className="user-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            👤 Admin <span className="user-menu-arrow">▼</span>
          </button>
          <div className={`user-dropdown ${menuOpen ? 'open' : ''}`} id="user-dropdown">
            <div className="user-dropdown-item" onClick={onLogout}>🚪 Çıkış Yap</div>
          </div>
        </div>
      </div>
    </div>
  );
};
