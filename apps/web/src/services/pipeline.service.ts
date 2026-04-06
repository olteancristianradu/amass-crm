import { api } from './api';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  probability: number;
  order: number;
  sortOrder?: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineListResult {
  pipelines: Pipeline[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listPipelines(
  filters?: Record<string, string | number | undefined>,
): Promise<PipelineListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  const raw = await api<Pipeline[] | PipelineListResult>(`/pipelines?${params}`);
  // API may return array directly or { pipelines, total, ... }
  if (Array.isArray(raw)) {
    const pipelines = raw.map(p => ({
      ...p,
      stages: (p.stages || []).map(s => ({ ...s, order: s.sortOrder ?? s.order ?? 0 })),
    }));
    return { pipelines, total: pipelines.length, page: 1, totalPages: 1 };
  }
  const result = raw as PipelineListResult;
  result.pipelines = (result.pipelines || []).map(p => ({
    ...p,
    stages: (p.stages || []).map(s => ({ ...s, order: s.sortOrder ?? s.order ?? 0 })),
  }));
  return result;
}

export async function getPipeline(id: string): Promise<Pipeline> {
  return api<Pipeline>(`/pipelines/${id}`);
}

export async function createPipeline(data: Partial<Pipeline>): Promise<Pipeline> {
  return api<Pipeline>('/pipelines', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePipeline(id: string, data: Partial<Pipeline>): Promise<Pipeline> {
  return api<Pipeline>(`/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deletePipeline(id: string): Promise<void> {
  await api(`/pipelines/${id}`, { method: 'DELETE' });
}
