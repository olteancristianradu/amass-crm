import { api } from './api';

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: string;
  revenue: number;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  description: string;
  tags: string[];
  ownerId?: string;
  owner?: { id: string; name: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
}

export interface CompanyListResult {
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listCompanies(
  filters?: Record<string, string | number | undefined>,
): Promise<CompanyListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<CompanyListResult>(`/companies?${params}`);
}

export async function getCompany(id: string): Promise<Company> {
  return api<Company>(`/companies/${id}`);
}

export async function createCompany(data: Partial<Company>): Promise<Company> {
  return api<Company>('/companies', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  return api<Company>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteCompany(id: string): Promise<void> {
  await api(`/companies/${id}`, { method: 'DELETE' });
}

export async function mergeCompanies(primaryId: string, secondaryId: string): Promise<Company> {
  return api<Company>('/companies/merge', {
    method: 'POST',
    body: JSON.stringify({ primaryId, secondaryId }),
  });
}
