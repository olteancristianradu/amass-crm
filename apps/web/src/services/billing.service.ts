import { api } from './api';

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  seats: number;
  pricePerSeat: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Usage {
  contacts: { used: number; limit: number };
  deals: { used: number; limit: number };
  emails: { used: number; limit: number };
  storage: { used: number; limit: number };
  users: { used: number; limit: number };
}

export interface UsageLimits {
  withinLimits: boolean;
  limits: Record<string, { used: number; limit: number; exceeded: boolean }>;
}

export interface Invoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  invoiceUrl?: string;
  createdAt: string;
}

export interface InvoiceListResult {
  invoices: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getSubscription(): Promise<Subscription> {
  return api<Subscription>('/billing/subscription');
}

export async function updateSubscription(data: {
  planId?: string;
  seats?: number;
}): Promise<Subscription> {
  return api<Subscription>('/billing/subscription', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function cancelSubscription(cancelAtPeriodEnd?: boolean): Promise<Subscription> {
  return api<Subscription>('/billing/subscription/cancel', {
    method: 'POST',
    body: JSON.stringify({ cancelAtPeriodEnd: cancelAtPeriodEnd ?? true }),
  });
}

export async function getUsage(): Promise<Usage> {
  return api<Usage>('/billing/usage');
}

export async function checkLimits(): Promise<UsageLimits> {
  return api<UsageLimits>('/billing/limits');
}

export async function listInvoices(
  filters?: Record<string, string | number | undefined>,
): Promise<InvoiceListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<InvoiceListResult>(`/billing/invoices?${params}`);
}
