import { api } from './api';

export interface SavedReport {
  id: string;
  name: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ReportResult {
  data: Record<string, unknown>[];
  columns: Array<{ key: string; label: string; type: string }>;
  total: number;
  generatedAt: string;
}

export interface DashboardWidget {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  createdAt: string;
  updatedAt: string;
}

export interface SavedReportListResult {
  reports: SavedReport[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listSavedReports(
  filters?: Record<string, string | number | undefined>,
): Promise<SavedReportListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<SavedReportListResult>(`/reports?${params}`);
}

export async function saveReport(data: Partial<SavedReport>): Promise<SavedReport> {
  return api<SavedReport>('/reports', { method: 'POST', body: JSON.stringify(data) });
}

export async function runReport(id: string, params?: Record<string, unknown>): Promise<ReportResult> {
  return api<ReportResult>(`/reports/${id}/run`, {
    method: 'POST',
    body: JSON.stringify(params ?? {}),
  });
}

export async function exportCsv(id: string): Promise<string> {
  return api<string>(`/reports/${id}/export/csv`);
}

export async function getDashboardWidgets(): Promise<DashboardWidget[]> {
  return api<DashboardWidget[]>('/dashboard/widgets');
}

export async function saveDashboardWidget(data: Partial<DashboardWidget>): Promise<DashboardWidget> {
  return api<DashboardWidget>('/dashboard/widgets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteDashboardWidget(id: string): Promise<void> {
  await api(`/dashboard/widgets/${id}`, { method: 'DELETE' });
}
