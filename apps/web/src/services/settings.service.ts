import { api } from './api';

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  user?: { id: string; name: string; email: string };
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export interface AuditLogListResult {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TenantSettings {
  id: string;
  name: string;
  domain: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  locale: string;
  features: Record<string, boolean>;
  branding?: { logo?: string; primaryColor?: string; companyName?: string };
  updatedAt: string;
}

export async function getAuditLogs(
  filters?: Record<string, string>,
): Promise<AuditLogListResult> {
  const params = new URLSearchParams(filters);
  return api<AuditLogListResult>(`/audit-logs?${params}`);
}

export async function getTenantSettings(): Promise<TenantSettings> {
  return api<TenantSettings>('/settings');
}

export async function updateTenantSettings(
  data: Record<string, unknown>,
): Promise<TenantSettings> {
  return api<TenantSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
