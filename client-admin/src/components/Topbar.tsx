import React, { useState, useRef, useEffect } from 'react';
import type { UserRole } from '../types';
import { getRoleLabel } from '../utils';

interface TopbarProps {
  reviewCount: number;
  emergencyCount: number;
  role: UserRole;
  userName: string;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  reviewCount,
  emergencyCount,
  role,
  userName,
  onLogout,
}) => {
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

  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">ABB</div>
        <div className="topbar-divider"></div>
        <div className="topbar-title">Altyapı Yönetim Paneli</div>
      </div>

      <div className="topbar-right">
        {(role === 'super_admin' || role === 'review') && reviewCount > 0 && (
          <div className="topbar-indicator topbar-indicator-review">
            <span className="topbar-indicator-dot"></span>
            {reviewCount} İnceleme
          </div>
        )}
        {(role === 'super_admin' || role === 'emergency') && emergencyCount > 0 && (
          <div className="topbar-indicator topbar-indicator-emergency">
            <span className="topbar-indicator-dot"></span>
            {emergencyCount} Acil
          </div>
        )}

        <div className="topbar-divider"></div>

        <div className="user-menu" ref={menuRef}>
          <button className="user-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="user-avatar">{initial}</div>
            <span className="user-name">{userName}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.7, transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {menuOpen && (
            <div className="user-dropdown open">
              <div className="user-dropdown-header">
                <div className="user-dropdown-name">{userName}</div>
                <div className="user-dropdown-role">{getRoleLabel(role)}</div>
              </div>
              <div className="user-dropdown-divider"></div>
              <div className="user-dropdown-item user-dropdown-item-danger" onClick={() => { setMenuOpen(false); onLogout(); }}>
                Çıkış Yap
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
