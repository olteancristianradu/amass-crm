import { api } from './api';

export interface SmsMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  contactId?: string;
  contact?: { id: string; firstName: string; lastName: string };
  sentAt: string;
  createdAt: string;
}

export interface SmsListResult {
  messages: SmsMessage[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SmsConversation {
  contactId: string;
  contact: { id: string; firstName: string; lastName: string; phone: string };
  messages: SmsMessage[];
  lastMessageAt: string;
}

export async function listSms(
  filters?: Record<string, string | number | undefined>,
): Promise<SmsListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<SmsListResult>(`/sms?${params}`);
}

export async function sendSms(data: {
  to: string;
  body: string;
  contactId?: string;
}): Promise<SmsMessage> {
  return api<SmsMessage>('/sms', { method: 'POST', body: JSON.stringify(data) });
}

export async function getConversation(contactId: string): Promise<SmsConversation> {
  return api<SmsConversation>(`/sms/conversations/${contactId}`);
}
