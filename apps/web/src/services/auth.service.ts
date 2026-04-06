import { api, setTokens, clearTokens } from './api';
import type { AuthTokens, User } from '@amass/shared';

export async function login(userId: string, pin?: string): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId, pin }),
  });
  setTokens(tokens);
  return tokens;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(tokens);
  return tokens;
}

export async function register(data: { email: string; password: string; name: string; tenantName?: string }): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setTokens(tokens);
  return tokens;
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}

export async function getUsers(): Promise<User[]> {
  return api<User[]>('/users');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function setup2fa(): Promise<{ secret: string; uri: string }> {
  return api('/auth/2fa/setup', { method: 'POST' });
}

export async function verify2fa(code: string): Promise<void> {
  await api('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) });
}

export async function getSessions(): Promise<any[]> {
  return api('/auth/sessions');
}

export async function revokeSession(id: string): Promise<void> {
  await api(`/auth/sessions/${id}`, { method: 'DELETE' });
}

export async function revokeAllSessions(): Promise<void> {
  await api('/auth/sessions', { method: 'DELETE' });
}
