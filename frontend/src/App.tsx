import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AccessProvider } from './contexts/AccessContext';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ClientFormPage from './pages/ClientFormPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import ServicesPage from './pages/ServicesPage';
import ProfilePage from './pages/ProfilePage';
import KanbanPage from './pages/KanbanPage';
import ProjectsPage from './pages/ProjectsPage';
import UsersPage from './pages/UsersPage';
import AccessPage from './pages/AccessPage';
import SetupPage from './pages/SetupPage';
import RoleGate from './components/RoleGate';
import type { ReactNode } from 'react';


function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function SetupGuard({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch('/api/setup/status')
      .then((res) => (res.ok ? res.json() : { needsSetup: false }))
      .then((data) => {
        setNeedsSetup(data.needsSetup);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) return null;
  if (needsSetup) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

function DocumentTitle() {
  const { settings } = useSettings();
  useEffect(() => {
    document.title = settings.projectName || 'Client CRM';
  }, [settings.projectName]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <DocumentTitle />
        <AuthProvider>
          <AccessProvider>
            <Routes>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/login" element={<SetupGuard><LoginPage /></SetupGuard>} />
              <Route path="/" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="dashboard"><DashboardPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/clients" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="clients"><ClientsPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/kanban" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="kanban"><KanbanPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/projects" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="projects"><ProjectsPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/invoices" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="invoices"><InvoicesPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/invoices/:invoiceNumber" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="invoices"><InvoiceDetailPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/services" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="services"><ServicesPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/clients/:displayId" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="clients"><ClientDetailPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/clients/:displayId/edit" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="clients"><ClientFormPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/profile" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="profile"><ProfilePage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/settings" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="settings"><SettingsPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/users" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="users"><UsersPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="/access" element={<SetupGuard><ProtectedRoute><RoleGate pageKey="access"><AccessPage /></RoleGate></ProtectedRoute></SetupGuard>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AccessProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
