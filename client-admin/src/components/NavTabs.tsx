import React from 'react';
import type { TabState } from '../types';

interface NavTabsProps {
  activeTab: TabState;
  onTabChange: (tab: TabState) => void;
}

export const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabState; label: string }[] = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'reports', label: '📋 Raporlar' },
    { id: 'map', label: '🗺️ Harita' },
  ];

  return (
    <div className="nav-tabs">
      {tabs.map((t) => (
        <div 
          key={t.id}
          className={`nav-tab ${activeTab === t.id ? 'active' : ''}`} 
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
};
