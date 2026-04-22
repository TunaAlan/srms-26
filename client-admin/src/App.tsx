import { useState, useEffect } from 'react';
import { apiFetch, login, logout as apiLogout, getToken } from './api';
import type { Report, TabState, UserRole } from './types';
import { mapReport } from './utils';

import { LoginScreen } from './components/LoginScreen';
import { Topbar } from './components/Topbar';
import { NavTabs } from './components/NavTabs';
import { Dashboard } from './components/Dashboard';
import { ReportsList } from './components/Reports';
import { MapView } from './components/Map';
import { DetailModal } from './components/DetailModal';
import { DeleteModal } from './components/DeleteModal';
import { ReviewQueue } from './components/ReviewQueue';
import { InspectionModal } from './components/InspectionModal';
import { ReviewModal } from './components/ReviewModal';
import { RejectModal } from './components/RejectModal';
import { EmergencyReports } from './components/EmergencyReports';
import { ForwardModal } from './components/ForwardModal';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>('super_admin');
  const [userName, setUserName] = useState<string>('Admin');

  const [reports, setReports] = useState<Report[]>([]);

  // Persist active tab across refreshes
  const [activeTab, setActiveTabState] = useState<TabState>(
    () => (sessionStorage.getItem('srms_tab') as TabState) || 'dashboard'
  );
  const setActiveTab = (tab: TabState) => {
    sessionStorage.setItem('srms_tab', tab);
    setActiveTabState(tab);
  };

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCriticality, setFilterCriticality] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail / Delete modals
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Review modals
  const [inspectTarget, setInspectTarget] = useState<Report | null>(null);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Report | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Report | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Emergency modal
  const [forwardTarget, setForwardTarget] = useState<Report | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Report | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Map focus
  const [focusedMapReport, setFocusedMapReport] = useState<Report | null>(null);
  const handleViewOnMap = (report: Report) => {
    setFocusedMapReport(report);
    setActiveTab('map');
  };

  // Login
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Restore session from stored token on mount
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiFetch('/auth/me').then((data) => {
      if (!data) return; // 401 → token invalid, stays on login
      const role = data.role as UserRole;
      setUserRole(role);
      setUserName(data.name || data.email || 'Admin');

      // Restore last tab if it's valid for this role, else use role default
      const saved = sessionStorage.getItem('srms_tab') as TabState | null;
      const ROLE_ALLOWED: Record<string, TabState[]> = {
        super_admin: ['dashboard', 'reports', 'map', 'review', 'emergency'],
        review:      ['dashboard', 'review', 'map'],
        emergency:   ['dashboard', 'emergency', 'map'],
      };
      const allowed = ROLE_ALLOWED[role] ?? ['dashboard'];
      const defaultTab: TabState = role === 'review' ? 'review' : role === 'emergency' ? 'emergency' : 'dashboard';
      const restoredTab = saved && allowed.includes(saved) ? saved : defaultTab;
      setActiveTab(restoredTab);
      setIsAuthenticated(true);
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadReports();
  }, [isAuthenticated]);

  const loadReports = async () => {
    try {
      const data = await apiFetch('/reports');
      if (data) setReports(data.map(mapReport));
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
      const role = data.user.role as UserRole;
      setUserRole(role);
      setUserName(data.user.name || data.user.email || 'Admin');
      if (role === 'review') setActiveTab('review');
      else if (role === 'emergency') setActiveTab('emergency');
      else setActiveTab('dashboard');
      setIsAuthenticated(true);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    sessionStorage.removeItem('srms_tab');
    sessionStorage.removeItem('rq_confidence');
    sessionStorage.removeItem('rq_category');
    sessionStorage.removeItem('em_criticality');
    setIsAuthenticated(false);
  };

  // --- Mevcut report güncelleme yardımcısı ---
  const patchReport = (id: string, updates: Partial<Report>) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  // --- Sil ---
  const handleDeleteConfirm = async (id: string) => {
    try {
      await apiFetch(`/reports/${id}`, { method: 'DELETE' });
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Rapor silinemedi:', err);
    } finally {
      setShowDeleteModal(false);
    }
  };

  // --- İnceleme: Onayla ---
  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/reports/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: 'approved' }),
      });
      patchReport(id, { reviewStatus: 'approved' });
    } catch (err) {
      console.error('Onaylama başarısız:', err);
    }
  };

  // --- İnceleme: Düzelt ---
  const handleCorrectSave = async (id: string, aiCategory: string, aiPriority: string, aiUnit: string) => {
    try {
      await apiFetch(`/reports/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: 'corrected', aiCategory, aiPriority, aiUnit }),
      });
      // Lokal state güncelle
      const updated = await apiFetch(`/reports/${id}`);
      if (updated) patchReport(id, mapReport(updated));
      else patchReport(id, { reviewStatus: 'corrected', category: aiCategory, aiUnit });
    } catch (err) {
      console.error('Düzeltme başarısız:', err);
    } finally {
      setShowReviewModal(false);
      setReviewTarget(null);
    }
  };

  // --- İnceleme: Reddet ---
  const handleRejectConfirm = async (id: string, reason: string) => {
    try {
      await apiFetch(`/reports/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: 'rejected', rejectReason: reason }),
      });
      patchReport(id, { reviewStatus: 'rejected', rejectReason: reason });
    } catch (err) {
      console.error('Reddetme başarısız:', err);
    } finally {
      setShowRejectModal(false);
      setRejectTarget(null);
    }
  };

  // --- Acil: İlet ---
  const handleForwardSave = async (id: string, forwardStatus: string, forwardNote: string) => {
    try {
      await apiFetch(`/reports/${id}/forward`, {
        method: 'PATCH',
        body: JSON.stringify({ forwardStatus, forwardNote }),
      });
      patchReport(id, {
        forwardStatus: forwardStatus as Report['forwardStatus'],
        forwardNote,
      });
    } catch (err) {
      console.error('İletim başarısız:', err);
    } finally {
      setShowForwardModal(false);
      setForwardTarget(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={(email, pass) => handleLogin(email, pass)}
        loading={loginLoading}
        error={loginError}
      />
    );
  }

  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? null;
  const deleteReport = reports.find((r) => r.id === deleteTargetId) ?? null;

  const reviewCount = reports.filter((r) => r.reviewStatus === 'pending').length;
  const emergencyCount = reports.filter(
    (r) =>
      (r.criticality === 'kritik' || r.criticality === 'yuksek') &&
      r.reviewStatus !== 'pending' &&
      r.reviewStatus !== 'rejected' &&
      r.forwardStatus !== 'completed'
  ).length;

  return (
    <>
      <Topbar
        reviewCount={reviewCount}
        emergencyCount={emergencyCount}
        role={userRole}
        userName={userName}
        onLogout={handleLogout}
      />
      <NavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        role={userRole}
        reviewCount={reviewCount}
        emergencyCount={emergencyCount}
      />

      <div className="main">
        {activeTab === 'dashboard' && (
          <Dashboard
            reports={reports}
            role={userRole}
            onViewReport={(id) => { setSelectedReportId(id); setShowDetailModal(true); }}
            onInspect={(r) => { setInspectTarget(r); setShowInspectModal(true); }}
            onTabChange={setActiveTab}
            onApprove={handleApprove}
            onReject={(r) => { setRejectTarget(r); setShowRejectModal(true); }}
            onForward={(r) => { setForwardTarget(r); setShowForwardModal(true); }}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsList
            reports={reports}
            role={userRole}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterCriticality={filterCriticality} setFilterCriticality={setFilterCriticality}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            onView={(id) => { setSelectedReportId(id); setShowDetailModal(true); }}
            onDelete={(id) => { setDeleteTargetId(id); setShowDeleteModal(true); }}
          />
        )}

        {activeTab === 'review' && (
          <ReviewQueue
            reports={reports}
            role={userRole}
            onApprove={handleApprove}
            onCorrect={(r) => { setReviewTarget(r); setShowReviewModal(true); }}
            onReject={(r) => { setRejectTarget(r); setShowRejectModal(true); }}
            onViewOnMap={handleViewOnMap}
          />
        )}

        {activeTab === 'emergency' && (
          <EmergencyReports
            reports={reports}
            role={userRole}
            onForward={(r) => { setForwardTarget(r); setShowForwardModal(true); }}
            onDelete={(id) => { setDeleteTargetId(id); setShowDeleteModal(true); }}
            onViewArchive={(r) => { setArchiveTarget(r); setShowArchiveModal(true); }}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            reports={reports}
            focusReport={focusedMapReport}
            onReportClick={(r) => {
              if (userRole === 'review') {
                setInspectTarget(r); setShowInspectModal(true);
              } else if (userRole === 'emergency') {
                if (r.forwardStatus === 'completed') {
                  setArchiveTarget(r); setShowArchiveModal(true);
                } else {
                  setForwardTarget(r); setShowForwardModal(true);
                }
              } else {
                setSelectedReportId(r.id); setShowDetailModal(true);
              }
            }}
          />
        )}
      </div>

      {/* Mevcut modaller */}
      {showDetailModal && selectedReport && (
        <DetailModal
          report={selectedReport}
          onClose={() => setShowDetailModal(false)}
          onViewOnMap={(r) => { setShowDetailModal(false); handleViewOnMap(r); }}
        />
      )}
      {showDeleteModal && deleteReport && (
        <DeleteModal
          report={deleteReport}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Yeni modaller */}
      {showInspectModal && inspectTarget && (
        <InspectionModal
          report={inspectTarget}
          role={userRole}
          onClose={() => { setShowInspectModal(false); setInspectTarget(null); }}
          onApprove={(id) => { handleApprove(id); setShowInspectModal(false); setInspectTarget(null); }}
          onCorrect={(r) => { setShowInspectModal(false); setInspectTarget(null); setReviewTarget(r); setShowReviewModal(true); }}
          onReject={(r) => { setShowInspectModal(false); setInspectTarget(null); setRejectTarget(r); setShowRejectModal(true); }}
          onViewOnMap={(r) => { setShowInspectModal(false); setInspectTarget(null); handleViewOnMap(r); }}
        />
      )}
      {showReviewModal && reviewTarget && (
        <ReviewModal
          report={reviewTarget}
          onClose={() => { setShowReviewModal(false); setReviewTarget(null); }}
          onSave={handleCorrectSave}
        />
      )}
      {showRejectModal && rejectTarget && (
        <RejectModal
          report={rejectTarget}
          onClose={() => { setShowRejectModal(false); setRejectTarget(null); }}
          onConfirm={handleRejectConfirm}
        />
      )}
      {showForwardModal && forwardTarget && (
        <ForwardModal
          report={forwardTarget}
          onClose={() => { setShowForwardModal(false); setForwardTarget(null); }}
          onSave={handleForwardSave}
          onViewOnMap={(r) => { setShowForwardModal(false); setForwardTarget(null); handleViewOnMap(r); }}
        />
      )}
      {showArchiveModal && archiveTarget && (
        <ForwardModal
          report={archiveTarget}
          onClose={() => { setShowArchiveModal(false); setArchiveTarget(null); }}
          onSave={() => {}}
          onViewOnMap={(r) => { setShowArchiveModal(false); setArchiveTarget(null); handleViewOnMap(r); }}
          readOnly
        />
      )}
    </>
  );
}

export default App;
