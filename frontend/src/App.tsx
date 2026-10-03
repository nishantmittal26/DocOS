import React, { useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { Navbar } from './components/Navbar';
import { NewPatientModal } from './components/NewPatientModal';
import { LoginPage } from './pages/auth/LoginPage';
import { OpdQueuePage } from './pages/queue/OpdQueuePage';
import { OpdHistoryPage } from './pages/history/OpdHistoryPage';
import { ConsultationRoomPage } from './pages/consultation/ConsultationRoomPage';
import { PatientsPage } from './pages/patients/PatientsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { OnboardDoctorPage } from './pages/admin/OnboardDoctorPage';
import { AdminClinicsPage } from './pages/admin/AdminClinicsPage';
import { ClinicSubscriptionPage } from './pages/admin/ClinicSubscriptionPage';
import { AdminVitalsPage } from './pages/admin/AdminVitalsPage';
import { AdminLabsPage } from './pages/admin/AdminLabsPage';
import { AdminAdvicePage } from './pages/admin/AdminAdvicePage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { PublicPrescriptionPage } from './pages/public/PublicPrescriptionPage';

// Automatically use HashRouter on GitHub Pages to prevent 404s on subpath page reloads
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
const useHash = import.meta.env.VITE_ROUTER_MODE === 'hash' || isGitHubPages;
const AppRouter = useHash ? HashRouter : BrowserRouter;

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Public routes (accessible to anyone without logging in)
  if (location.pathname.startsWith('/rx/')) {
    return (
      <Routes>
        <Route path="/rx/:token" element={<PublicPrescriptionPage />} />
      </Routes>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 text-sm">
        Initializing DocOS...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const isPlatformStaff = hasRole('PlatformAdmin') || hasRole('SalesAgent');
  const isPlatformAdmin = hasRole('PlatformAdmin');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16">
        <Routes>
          {isPlatformStaff ? (
            /* Platform Admin & Sales Agent Routes */
            <>
              <Route path="/" element={<Navigate to="/admin/clinics" replace />} />
              <Route path="/admin/clinics" element={<AdminClinicsPage />} />
              <Route path="/admin/onboard-doctor" element={<OnboardDoctorPage />} />
              <Route
                path="/admin/masters/vitals"
                element={
                  isPlatformAdmin ? (
                    <AdminVitalsPage />
                  ) : (
                    <Navigate to="/admin/clinics" replace />
                  )
                }
              />
              <Route
                path="/admin/masters/labs"
                element={
                  isPlatformAdmin ? (
                    <AdminLabsPage />
                  ) : (
                    <Navigate to="/admin/clinics" replace />
                  )
                }
              />
              <Route
                path="/admin/masters/advice"
                element={
                  isPlatformAdmin ? (
                    <AdminAdvicePage />
                  ) : (
                    <Navigate to="/admin/clinics" replace />
                  )
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  isPlatformAdmin ? (
                    <AdminAuditLogsPage />
                  ) : (
                    <Navigate to="/admin/clinics" replace />
                  )
                }
              />
              <Route
                path="/admin/clinics/:clinicId/subscription"
                element={
                  isPlatformAdmin ? (
                    <ClinicSubscriptionPage />
                  ) : (
                    <Navigate to="/admin/clinics" replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to="/admin/clinics" replace />} />
            </>
          ) : (
            /* Clinic Staff (Doctor, ClinicAdmin, Nurse, Receptionist) Routes */
            <>
              <Route
                path="/"
                element={<OpdQueuePage onOpenNewPatient={() => setIsNewPatientOpen(true)} />}
              />
              <Route path="/history" element={<OpdHistoryPage />} />
              <Route
                path="/patients"
                element={<PatientsPage onOpenNewPatient={() => setIsNewPatientOpen(true)} />}
              />
              <Route path="/consultation/:visitId" element={<ConsultationRoomPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/vitals" element={<Navigate to="/settings?tab=vitals" replace />} />
              <Route path="/settings/lab-tests" element={<Navigate to="/settings?tab=labs" replace />} />
              <Route path="/settings/advice" element={<Navigate to="/settings?tab=advice" replace />} />
              <Route path="/admin/*" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </main>

      {/* Global New Patient Registration Modal (Clinic Staff only) */}
      {!isPlatformStaff && (
        <NewPatientModal
          isOpen={isNewPatientOpen}
          onClose={() => setIsNewPatientOpen(false)}
          onPatientAdded={(_, queued) => {
            if (queued) {
              navigate('/');
            }
          }}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppRouter>
      <AuthProvider>
        <LoadingProvider>
          <AppContent />
        </LoadingProvider>
      </AuthProvider>
    </AppRouter>
  );
};

export default App;
