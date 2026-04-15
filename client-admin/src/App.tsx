import { useState, useEffect } from 'react';
import { apiFetch, login, getToken } from './api';
import type { Report, TabState } from './types';
import { mapReport } from './utils';

import { LoginScreen } from './components/LoginScreen';
import { Topbar } from './components/Topbar';
import { NavTabs } from './components/NavTabs';
import { Dashboard } from './components/Dashboard';
import { ReportsList } from './components/Reports';
import { MapView } from './components/Map';
import { DetailModal } from './components/DetailModal';
import { DeleteModal } from './components/DeleteModal';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getToken());
  
  // State from vanilla implementation
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<TabState>('dashboard');
  
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCriticality, setFilterCriticality] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Login variables
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadReports();
    }
  }, [isAuthenticated]);

  const loadReports = async () => {
    try {
      const data = await apiFetch('/reports');
      if (data) {
        setReports(data.map(mapReport));
      }
    } catch (err) {
      console.error('Raporlar yüklenemedi:', err);
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const data = await login(email, pass);
      localStorage.setItem('srms_token', data.token);
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('srms_token');
    setIsAuthenticated(false);
  };

  const handleSaveReport = async (id: string, newStatus: string, newRes: string) => {
    try {
      await apiFetch(`/reports/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, staffNote: newRes }),
      });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any, resolution: newRes } : r));
    } catch (err) {
      console.error('Rapor güncellenemedi:', err);
    } finally {
      setShowDetailModal(false);
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await apiFetch(`/reports/${id}`, { method: 'DELETE' });
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Rapor silinemedi:', err);
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} loading={loginLoading} error={loginError} />;
  }

  const selectedReport = reports.find(r => r.id === selectedReportId) || null;
  const deleteReport = reports.find(r => r.id === deleteTargetId) || null;
  const pendingCount = reports.filter((r) => r.status === 'beklemede').length;

  return (
    <>
      <Topbar pendingCount={pendingCount} onLogout={handleLogout} />
      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="main">
        {activeTab === 'dashboard' && (
          <Dashboard 
            reports={reports} 
            onViewReport={(id) => { setSelectedReportId(id); setShowDetailModal(true); }} 
          />
        )}
        
        {activeTab === 'reports' && (
          <ReportsList
            reports={reports}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterCriticality={filterCriticality} setFilterCriticality={setFilterCriticality}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            onView={(id) => { setSelectedReportId(id); setShowDetailModal(true); }}
            onDelete={(id) => { setDeleteTargetId(id); setShowDeleteModal(true); }}
          />
        )}

        {activeTab === 'map' && (
          <MapView reports={reports} />
        )}
      </div>

      {showDetailModal && selectedReport && (
        <DetailModal 
          report={selectedReport} 
          onClose={() => setShowDetailModal(false)}
          onSave={handleSaveReport} 
        />
      )}

      {showDeleteModal && deleteReport && (
        <DeleteModal 
          report={deleteReport} 
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm} 
        />
      )}
    </>
  );
}

export default App;
