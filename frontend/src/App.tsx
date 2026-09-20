import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);

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
            window.location.href = '/';
          }
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <LoadingProvider>
          <AppContent />
        </LoadingProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
