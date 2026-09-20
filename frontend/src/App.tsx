import React, { useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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

// Automatically use HashRouter on GitHub Pages to prevent 404s on subpath page reloads
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
const useHash = import.meta.env.VITE_ROUTER_MODE === 'hash' || isGitHubPages;
const AppRouter = useHash ? HashRouter : BrowserRouter;

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar onOpenNewPatient={() => setIsNewPatientOpen(true)} />

      <main className="flex-1 pb-16">
        <Routes>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global New Patient Registration Modal */}
      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        onPatientAdded={(_, queued) => {
          if (queued) {
            navigate('/');
          }
        }}
      />
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
