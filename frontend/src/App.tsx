import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppsListPage } from './pages/AppsListPage';
import { AppDetailPage } from './pages/AppDetailPage';
import { OnboardWizardPage } from './pages/OnboardWizardPage';
import { IntegrationInfoPage } from './pages/IntegrationInfoPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/apps" element={<AppsListPage />} />
          <Route path="/apps/:type/:id" element={<AppDetailPage />} />
          <Route path="/onboard" element={<OnboardWizardPage />} />
          <Route path="/integration-info" element={<IntegrationInfoPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
