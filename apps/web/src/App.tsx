import { Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';

class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{padding: 40, color: '#ff6b6b', background: '#1a1a2e', minHeight: '100vh', fontFamily: 'monospace'}}>
        <h2>Page Error</h2>
        <pre style={{whiteSpace: 'pre-wrap', color: '#ccc'}}>{this.state.error.message}</pre>
        <pre style={{whiteSpace: 'pre-wrap', color: '#888', fontSize: 12}}>{this.state.error.stack}</pre>
        <button onClick={() => { this.setState({error: null}); window.location.href = '/dashboard'; }} style={{marginTop: 20, padding: '8px 16px', background: '#C8102E', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'}}>Go to Dashboard</button>
      </div>
    );
    return this.props.children;
  }
}
import { PipelinePage } from '@/pages/PipelinePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ClientPage } from '@/pages/ClientPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { ContactDetailPage } from '@/pages/ContactDetailPage';
import { CompaniesPage } from '@/pages/CompaniesPage';
import { CompanyDetailPage } from '@/pages/CompanyDetailPage';
import { DealsPage } from '@/pages/DealsPage';
import { DealDetailPage } from '@/pages/DealDetailPage';
import { TasksPage } from '@/pages/TasksPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { InboxPage } from '@/pages/InboxPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { WhiteLabelPage } from '@/pages/admin/WhiteLabelPage';
import { SequencesPage } from '@/pages/SequencesPage';
import { CallsPage } from '@/pages/CallsPage';
import { IntegrationsPage } from '@/pages/IntegrationsPage';
import BillingPage from '@/pages/BillingPage';
import { GdprPage } from '@/pages/GdprPage';
import { NotificationsPage } from '@/pages/NotificationsPage';

function LoginGuard() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/deals" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginGuard />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/deals/:id" element={<DealDetailPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompanyDetailPage />} />
          <Route path="/clients/:id" element={<ClientPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/admin/whitelabel" element={<WhiteLabelPage />} />
          <Route path="/sequences" element={<SequencesPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/gdpr" element={<GdprPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/" element={<Navigate to="/deals" replace />} />
          <Route path="*" element={<Navigate to="/deals" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
