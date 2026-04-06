import { api } from './api';

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  probability?: number;
  expectedCloseDate?: string;
  closedAt?: string;
  wonAt?: string;
  lostAt?: string;
  lossReason: string;
  lossNote: string;
  source: string;
  notes: string;
  tags: string[];
  pipelineId: string;
  stageId: string;
  companyId?: string;
  assignedToId?: string;
  pipeline?: { id: string; name: string };
  stage?: { id: string; name: string; color: string; probability: number };
  company?: { id: string; name: string };
  assignedTo?: { id: string; name: string; avatar?: string };
  contacts?: Array<{
    contact: { id: string; firstName: string; lastName: string; email: string };
  }>;
  lineItems?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DealListResult {
  deals: Deal[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listDeals(
  filters?: Record<string, string | number | undefined>,
): Promise<DealListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<DealListResult>(`/deals?${params}`);
}

export async function getDeal(id: string): Promise<Deal> {
  return api<Deal>(`/deals/${id}`);
}

export async function createDeal(data: Record<string, unknown>): Promise<Deal> {
  return api<Deal>('/deals', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateDeal(id: string, data: Record<string, unknown>): Promise<Deal> {
  return api<Deal>(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function moveDealStage(
  id: string,
  stageId: string,
  lossReason?: string,
  lossNote?: string,
): Promise<Deal> {
  return api<Deal>(`/deals/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stageId, lossReason, lossNote }),
  });
}

export async function deleteDeal(id: string): Promise<void> {
  await api(`/deals/${id}`, { method: 'DELETE' });
}

export async function getKanban(pipelineId: string) {
  return api(`/deals/kanban/${pipelineId}`);
}

export async function getForecast() {
  return api('/deals/forecast');
}

export async function getWinLossAnalysis() {
  return api('/deals/analysis');
}
