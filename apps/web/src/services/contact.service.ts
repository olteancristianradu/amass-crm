import { api } from './api';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  jobTitle: string;
  source: string;
  tags: string[];
  score: number;
  companyId?: string;
  company?: { id: string; name: string };
  assignedToId?: string;
  assignedTo?: { id: string; name: string; avatar?: string };
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListResult {
  contacts: Contact[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listContacts(
  filters?: Record<string, string | number | undefined>,
): Promise<ContactListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<ContactListResult>(`/contacts?${params}`);
}

export async function getContact(id: string): Promise<Contact> {
  return api<Contact>(`/contacts/${id}`);
}

export async function createContact(data: Partial<Contact>): Promise<Contact> {
  return api<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
  return api<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteContact(id: string): Promise<void> {
  await api(`/contacts/${id}`, { method: 'DELETE' });
}

export async function mergeContacts(primaryId: string, secondaryId: string): Promise<Contact> {
  return api<Contact>('/contacts/merge', {
    method: 'POST',
    body: JSON.stringify({ primaryId, secondaryId }),
  });
}

export async function exportContactsCsv(): Promise<string> {
  return api<string>('/contacts/export/csv');
}
