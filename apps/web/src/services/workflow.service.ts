import { api } from './api';

export interface WorkflowStep {
  id: string;
  type: string;
  config: Record<string, unknown>;
  order: number;
}

export interface WorkflowTrigger {
  type: string;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  lastRunAt?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowListResult {
  workflows: Workflow[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listWorkflows(
  filters?: Record<string, string | number | undefined>,
): Promise<WorkflowListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<WorkflowListResult>(`/workflows?${params}`);
}

export async function getWorkflow(id: string): Promise<Workflow> {
  return api<Workflow>(`/workflows/${id}`);
}

export async function createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
  return api<Workflow>('/workflows', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
  return api<Workflow>(`/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteWorkflow(id: string): Promise<void> {
  await api(`/workflows/${id}`, { method: 'DELETE' });
}

export async function toggleWorkflow(id: string, enabled: boolean): Promise<Workflow> {
  return api<Workflow>(`/workflows/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function executeWorkflow(id: string, context?: Record<string, unknown>): Promise<void> {
  await api(`/workflows/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify(context ?? {}),
  });
}
