/**
 * Modulul principal de comunicare cu API-ul backend.
 *
 * Rolul acestui fisier:
 * - Gestioneaza token-urile JWT (access + refresh) pentru autentificare
 * - Ofera functia generica api<T>() pentru toate apelurile HTTP catre backend
 * - Implementeaza auto-refresh: cand token-ul expira (401), incearca sa-l reinnoiasca automat
 * - Centralizeaza gestionarea erorilor de retea
 *
 * Cum se foloseste:
 *   import { api, setTokens, clearTokens } from './api';
 *   const data = await api<TipRaspuns>('/endpoint', { method: 'POST', body: ... });
 *
 * Cum se modifica:
 * - Pentru a adauga un header custom la toate request-urile, modifica obiectul headers din api()
 * - Pentru a schimba URL-ul de baza, modifica constanta BASE
 * - Pentru a adauga interceptori (logging, retry etc.), modifica functia api()
 */
import type { AuthTokens } from '@amass/shared';

/**
 * URL-ul de baza pentru toate apelurile API.
 * In development, Vite proxy-ul redirecteaza /api catre backend-ul pe portul 3000.
 */
const BASE = '/api/v1';

/**
 * Token-urile de autentificare pastrate in memorie pentru acces rapid.
 * La initializare, se citesc din localStorage (daca exista) pentru persistenta intre refresh-uri.
 */
let accessToken: string | null = localStorage.getItem('amass-token');
let refreshToken: string | null = localStorage.getItem('amass-refresh');

/**
 * Salveaza token-urile JWT (access si refresh) atat in memorie cat si in localStorage.
 * @param tokens - Obiectul AuthTokens care contine accessToken si refreshToken
 *
 * Se apeleaza dupa:
 * - Login reusit
 * - Refresh reusit al token-ului
 */
export function setTokens(tokens: AuthTokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  localStorage.setItem('amass-token', tokens.accessToken);
  localStorage.setItem('amass-refresh', tokens.refreshToken);
}

/**
 * Sterge toate token-urile din memorie si din localStorage.
 * Se apeleaza la:
 * - Logout
 * - Eroare de refresh (token-ul refresh a expirat)
 * - Eroare de autentificare irecuperabila
 */
export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('amass-token');
  localStorage.removeItem('amass-refresh');
}

/**
 * Returneaza token-ul de acces curent (sau null daca nu exista).
 * Folosit de serviciul de socket pentru autentificarea conexiunii WebSocket.
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Incearca sa reinnoiasca token-ul de acces folosind refresh token-ul.
 * Trimite un POST catre /auth/refresh cu refresh token-ul curent.
 *
 * @returns true daca refresh-ul a reusit si noile token-uri au fost salvate,
 *          false daca refresh-ul a esuat (token-urile sunt sterse automat)
 *
 * Aceasta functie este privata - se apeleaza automat din api() cand primeste 401.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const tokens: AuthTokens = await res.json();
    setTokens(tokens);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

/**
 * Functia principala pentru apeluri API. Wrapper generic peste fetch().
 *
 * @template T - Tipul raspunsului asteptat (se parseaza automat din JSON)
 * @param path - Calea relativa a endpoint-ului (ex: '/clients', '/auth/login')
 * @param options - Optiuni RequestInit standard (method, body, headers etc.)
 * @returns Promise cu raspunsul parsat ca tip T
 * @throws Error cu mesajul de eroare de la server sau statusul HTTP
 *
 * Functionalitati:
 * 1. Adauga automat header-ul Authorization cu Bearer token (daca exista)
 * 2. Seteaza automat Content-Type: application/json
 * 3. La raspuns 401 (Unauthorized), incearca auto-refresh si repeta cererea
 * 4. Suporta raspunsuri CSV (returneaza text in loc de JSON)
 * 5. Arunca o eroare descriptiva daca raspunsul nu este OK
 *
 * Exemplu de utilizare:
 *   const clients = await api<Client[]>('/clients?page=1');
 *   await api('/clients', { method: 'POST', body: JSON.stringify(data) });
 */
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  /** Construieste headerele - adauga Content-Type si Authorization */
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  /** Adauga token-ul de autorizare daca este disponibil */
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  /** Executa cererea HTTP catre backend */
  let res = await fetch(`${BASE}${path}`, { ...options, headers });

  /**
   * Auto-refresh la 401 (Unauthorized):
   * Daca serverul raspunde cu 401 si avem un refresh token,
   * incercam sa reinnoim access token-ul si repetam cererea originala.
   */
  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(`${BASE}${path}`, { ...options, headers });
    }
  }

  /** Daca raspunsul nu este OK, extrage mesajul de eroare si arunca exceptie */
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error ${res.status}`);
  }

  /**
   * Suport pentru export CSV:
   * Daca raspunsul este text/csv, returneaza textul brut in loc de JSON.
   */
  if (res.headers.get('content-type')?.includes('text/csv')) {
    return (await res.text()) as unknown as T;
  }

  /** Parseaza si returneaza raspunsul JSON */
  return res.json();
}
