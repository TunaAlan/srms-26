import React from 'react';
import type { TabState, UserRole } from '../types';

interface NavTabsProps {
  activeTab: TabState;
  onTabChange: (tab: TabState) => void;
  role: UserRole;
  reviewCount: number;
}

const TAB_SETS: Record<UserRole, { id: TabState; label: string }[]> = {
  admin: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports', label: 'Raporlar' },
    { id: 'review', label: 'İnceleme Kuyruğu' },
    { id: 'map', label: 'Harita' },
    { id: 'personnel', label: 'Personel' },
  ],
  review_personnel: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'review', label: 'İnceleme Kuyruğu' },
    { id: 'map', label: 'Harita' },
  ],
};

export const NavTabs: React.FC<NavTabsProps> = ({
  activeTab,
  onTabChange,
  role,
  reviewCount,
}) => {
  const tabs = TAB_SETS[role];

  return (
    <div className="nav-tabs">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`nav-tab ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
          {t.id === 'review' && reviewCount > 0 && (
            <span className="nav-tab-badge nav-tab-badge-review">{reviewCount}</span>
          )}
        </div>
      ))}
    </div>
  );
};
