import { api } from './api';

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  displayName: string;
  isDefault: boolean;
  syncStatus: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailMessage {
  id: string;
  accountId: string;
  threadId: string;
  subject: string;
  from: { email: string; name: string };
  to: Array<{ email: string; name: string }>;
  cc?: Array<{ email: string; name: string }>;
  bcc?: Array<{ email: string; name: string }>;
  body: string;
  bodyText: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: Array<{ id: string; filename: string; size: number; contentType: string }>;
  sentAt: string;
  receivedAt: string;
  createdAt: string;
}

export interface EmailThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  contactId?: string;
  dealId?: string;
  contact?: { id: string; firstName: string; lastName: string; email: string };
  deal?: { id: string; title: string };
  lastMessageAt: string;
}

export interface EmailMessageListResult {
  messages: EmailMessage[];
  total: number;
  page: number;
  totalPages: number;
}

export interface EmailStats {
  sent: number;
  received: number;
  openRate: number;
  responseRate: number;
  avgResponseTime: number;
  period: { from: string; to: string };
}

export async function listAccounts(): Promise<EmailAccount[]> {
  return api<EmailAccount[]>('/email/accounts');
}

export async function connectAccount(data: {
  provider: string;
  authCode: string;
}): Promise<EmailAccount> {
  return api<EmailAccount>('/email/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listMessages(
  filters?: Record<string, string | number | undefined>,
): Promise<EmailMessageListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<EmailMessageListResult>(`/email/messages?${params}`);
}

export async function sendEmail(data: {
  accountId: string;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  body: string;
  threadId?: string;
}): Promise<EmailMessage> {
  return api<EmailMessage>('/email/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getThread(threadId: string): Promise<EmailThread> {
  return api<EmailThread>(`/email/threads/${threadId}`);
}

export async function getUnifiedInbox(
  filters?: Record<string, string | number | undefined>,
): Promise<EmailMessageListResult> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<EmailMessageListResult>(`/email/inbox?${params}`);
}

export async function getEmailStats(
  filters?: Record<string, string | number | undefined>,
): Promise<EmailStats> {
  const params = new URLSearchParams();
  if (filters)
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
  return api<EmailStats>(`/email/stats?${params}`);
}
