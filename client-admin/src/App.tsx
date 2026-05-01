import { useState, useEffect, useRef } from 'react';
import { apiFetch, login, logout as apiLogout, getToken, changeReportStatus, fetchStaff, createStaff, setStaffActive, deleteStaff } from './api';
import type { Report, StaffUser, TabState, UserRole } from './types';
// StaffUser used via useState<StaffUser[]>
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
import { PersonnelPanel } from './components/PersonnelPanel';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [userName, setUserName] = useState<string>('Admin');
  const [userId, setUserId] = useState<string>('');

  const [reports, setReports] = useState<Report[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);

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
  const [filterUnit, setFilterUnit] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [inspectTarget, setInspectTarget] = useState<Report | null>(null);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Report | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Report | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [focusedMapReport, setFocusedMapReport] = useState<Report | null>(null);
  const handleViewOnMap = (report: Report) => {
    setFocusedMapReport(report);
    setActiveTab('map');
  };

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiFetch('/auth/me').then((data) => {
      if (!data) return;
      const role = data.role as UserRole;
      setUserRole(role);
      setUserName(data.name || data.email || 'Admin');
      setUserId(data.id || '');

      const saved = sessionStorage.getItem('srms_tab') as TabState | null;
      const ROLE_ALLOWED: Record<string, TabState[]> = {
        admin: ['dashboard', 'reports', 'map', 'review'],
        review_personnel: ['dashboard', 'review', 'map'],
      };
      const allowed = ROLE_ALLOWED[role] ?? ['dashboard'];
      const defaultTab: TabState = role === 'review_personnel' ? 'review' : 'dashboard';
      const restoredTab = saved && allowed.includes(saved) ? saved : defaultTab;
      setActiveTab(restoredTab);
      setIsAuthenticated(true);
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadReports();
      if (userRole === 'admin') loadStaff();
    }
  }, [isAuthenticated]);

  // Hızlı polling: pending rapor varken AI tamamlanmasını bekler
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    const hasPending = reports.some((r) => r.status === 'pending');
    if (hasPending) {
      if (!pollRef.current) {
        pollRef.current = setInterval(loadReports, 8000);
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [reports, isAuthenticated]);

  // Yavaş polling: yeni gelen raporları her zaman yakalar
  const bgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    bgPollRef.current = setInterval(loadReports, 20000);
    return () => {
      if (bgPollRef.current) { clearInterval(bgPollRef.current); bgPollRef.current = null; }
    };
  }, [isAuthenticated]);

  const loadStaff = async () => {
    try {
      const data = await fetchStaff();
      if (data) setStaff(data);
    } catch (err) {
      console.error('Personel yüklenemedi:', err);
    }
  };

  const handleAddStaff = async (data: { name: string; email: string; password: string; role: string }) => {
    try {
      const user = await createStaff(data);
      if (user) setStaff((prev) => [user, ...prev]);
    } catch (err) {
      console.error('Personel eklenemedi:', err);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await setStaffActive(id, isActive);
      setStaff((prev) => prev.map((u) => u.id === id ? { ...u, isActive } : u));
    } catch (err) {
      console.error('Durum değiştirilemedi:', err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await deleteStaff(id);
      setStaff((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error('Personel silinemedi:', err);
    }
  };

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
      setUserId(data.user.id || '');
      if (role === 'review_personnel') setActiveTab('review');
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
    setIsAuthenticated(false);
  };

  const patchReport = (id: string, updates: Partial<Report>) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleChangeStatus = async (id: string, status: 'in_review' | 'in_progress' | 'resolved', note?: string) => {
    try {
      await changeReportStatus(id, status, note);
      patchReport(id, {
        status,
        ...(status === 'in_review' ? { reviewStatus: null, rejectReason: null, resolution: note ?? '' } : {}),
        ...(status !== 'in_review' && note !== undefined ? { resolution: note } : {}),
      });
    } catch (err) {
      console.error('Durum değiştirilemedi:', err);
    }
  };

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

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/reports/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: 'approved' }),
      });
      patchReport(id, { reviewStatus: 'approved', status: 'in_progress', resolution: '' });
    } catch (err) {
      console.error('Onaylama başarısız:', err);
    }
  };

  const handleCorrectSave = async (id: string, aiCategory: string, aiPriority: string, aiUnit: string, note?: string) => {
    try {
      await apiFetch(`/reports/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: 'corrected', aiCategory, aiPriority, aiUnit, ...(note ? { staffNote: note } : {}) }),
      });
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

  const handleRejectConfirm = async (id: string, reason: string) => {
    try {
      await apiFetch(`/reports/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: 'rejected', rejectReason: reason }),
      });
      patchReport(id, { reviewStatus: 'rejected', rejectReason: reason, status: 'rejected', resolution: '' });
    } catch (err) {
      console.error('Reddetme başarısız:', err);
    } finally {
      setShowRejectModal(false);
      setRejectTarget(null);
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
  const reviewCount = reports.filter((r) => r.status === 'in_review').length;

  return (
    <>
      <Topbar
        reviewCount={reviewCount}
        role={userRole}
        userName={userName}
        onLogout={handleLogout}
      />
      <NavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        role={userRole}
        reviewCount={reviewCount}
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
            onReject={(r) => { setInspectTarget(r); setRejectTarget(r); setShowRejectModal(true); }}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsList
            reports={reports}
            role={userRole}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterCriticality={filterCriticality} setFilterCriticality={setFilterCriticality}
            filterUnit={filterUnit} setFilterUnit={setFilterUnit}
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
            onCorrect={(r) => { setInspectTarget(r); setReviewTarget(r); setShowReviewModal(true); }}
            onReject={(r) => { setInspectTarget(r); setRejectTarget(r); setShowRejectModal(true); }}
            onViewOnMap={handleViewOnMap}
          />
        )}

        {activeTab === 'personnel' && (
          <PersonnelPanel
            staff={staff}
            currentUserId={userId}
            onAdd={handleAddStaff}
            onToggleActive={handleToggleActive}
            onDelete={handleDeleteStaff}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            reports={reports}
            focusReport={focusedMapReport}
            onReportClick={(r) => {
              if (r.status === 'in_review') {
                setInspectTarget(r); setShowInspectModal(true);
              } else {
                setSelectedReportId(r.id); setShowDetailModal(true);
              }
            }}
          />
        )}
      </div>

      {showDetailModal && selectedReport && (
        <DetailModal
          report={selectedReport}
          role={userRole}
          onClose={() => setShowDetailModal(false)}
          onViewOnMap={(r) => { setShowDetailModal(false); handleViewOnMap(r); }}
          onChangeStatus={handleChangeStatus}
          onReject={(r) => { setShowDetailModal(false); setRejectTarget(r); setShowRejectModal(true); }}
        />
      )}
      {showDeleteModal && deleteReport && (
        <DeleteModal
          report={deleteReport}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {showInspectModal && inspectTarget && (
        <InspectionModal
          report={inspectTarget}
          role={userRole}
          onClose={() => { setShowInspectModal(false); setInspectTarget(null); }}
          onApprove={(id) => { handleApprove(id); setShowInspectModal(false); setInspectTarget(null); }}
          onCorrect={(r) => { setShowInspectModal(false); setReviewTarget(r); setShowReviewModal(true); }}
          onReject={(r) => { setShowInspectModal(false); setRejectTarget(r); setShowRejectModal(true); }}
          onViewOnMap={(r) => { setShowInspectModal(false); setInspectTarget(null); handleViewOnMap(r); }}
        />
      )}
      {showReviewModal && reviewTarget && (
        <ReviewModal
          report={reviewTarget}
          onClose={() => { setShowReviewModal(false); setReviewTarget(null); setInspectTarget(null); }}
          onBack={inspectTarget ? () => { setShowReviewModal(false); setReviewTarget(null); setShowInspectModal(true); } : undefined}
          onSave={handleCorrectSave}
        />
      )}
      {showRejectModal && rejectTarget && (
        <RejectModal
          report={rejectTarget}
          onClose={() => { setShowRejectModal(false); setRejectTarget(null); setInspectTarget(null); }}
          onBack={inspectTarget ? () => { setShowRejectModal(false); setRejectTarget(null); setShowInspectModal(true); } : undefined}
          onConfirm={handleRejectConfirm}
        />
      )}
    </>
  );
}

export default App;
