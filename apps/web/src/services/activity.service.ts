import { api } from './api';

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string;
  outcome?: string;
  duration?: number;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  userId: string;
  contact?: { id: string; firstName: string; lastName: string };
  company?: { id: string; name: string };
  deal?: { id: string; title: string };
  user?: { id: string; name: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityListResult {
  activities: Activity[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ActivityStats {
  totalActivities: number;
  byType: Record<string, number>;
  byUser: Array<{ userId: string; name: string; count: number }>;
  period: { from: string; to: string };
}

export async function listActivities(
  filters?: Record<string, string | number | undefined>,
): Promise<ActivityListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<ActivityListResult>(`/activities?${params}`);
}

export async function createActivity(data: Partial<Activity>): Promise<Activity> {
  return api<Activity>('/activities', { method: 'POST', body: JSON.stringify(data) });
}

export async function getTimeline(
  filters?: Record<string, string | number | undefined>,
): Promise<ActivityListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<ActivityListResult>(`/activities/timeline?${params}`);
}

export async function getStats(
  filters?: Record<string, string | number | undefined>,
): Promise<ActivityStats> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<ActivityStats>(`/activities/stats?${params}`);
}
