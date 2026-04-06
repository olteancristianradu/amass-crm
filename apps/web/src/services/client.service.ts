/**
 * Serviciu pentru gestionarea clientilor CRM.
 *
 * Rolul acestui fisier:
 * - Centralizeaza toate operatiunile CRUD pe entitatea Client
 * - Ofera functii pentru listare, cautare, filtrare, creare, editare, stergere
 * - Suporta import din email (individual si batch) si export CSV
 * - Gestioneaza mutarea clientilor intre etapele pipeline-ului
 *
 * Cum se foloseste:
 *   import * as clientService from './client.service';
 *   const result = await clientService.listClients({ search: 'Ion', stage: 'Contactat' });
 *   const client = await clientService.getClient('id-123');
 *
 * Cum se modifica:
 * - Pentru a adauga un filtru nou, extinde interfata ClientFilters din @amass/shared
 *   si adauga parametrul in listClients()
 * - Pentru a adauga un nou endpoint, creeaza o noua functie async care apeleaza api()
 */
import { api } from './api';
import type { Client, ClientFilters } from '@amass/shared';

/**
 * Interfata raspunsului paginat pentru listarea clientilor.
 *
 * clients    - Array-ul de clienti pentru pagina curenta
 * total      - Numarul total de clienti care corespund filtrelor
 * page       - Pagina curenta (indexata de la 1)
 * totalPages - Numarul total de pagini disponibile
 */
interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Listeaza clientii cu filtre si paginare optionala.
 *
 * @param filters - Obiect cu filtrele de aplicat:
 *   - search: text de cautare (cauta in nume, telefon, email, localitate)
 *   - stage: filtreaza dupa etapa pipeline-ului (ex: 'Contactat', 'Oferta')
 *   - assignedToId: filtreaza dupa agentul asignat
 *   - hasSolar: filtreaza clientii cu/fara panouri solare (boolean)
 *   - page: numarul paginii (default: 1)
 *   - limit: numarul de clienti per pagina (default: stabilit de server)
 *
 * @returns Promise<ClientListResponse> - Raspuns paginat cu clientii si metadate
 *
 * Construieste query string-ul doar cu filtrele care au valori (evita parametri goi).
 */
export async function listClients(filters: ClientFilters = {}): Promise<ClientListResponse> {
  /** Construieste parametrii de query din filtrele active */
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.assignedToId) params.set('assignedTo', filters.assignedToId);
  if (filters.hasSolar !== undefined) params.set('hasSolar', String(filters.hasSolar));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return api<ClientListResponse>(`/clients${qs ? `?${qs}` : ''}`);
}

/**
 * Obtine detaliile complete ale unui client dupa ID.
 *
 * @param id - ID-ul unic al clientului
 * @returns Promise<Client> - Obiectul Client complet cu toate campurile
 *
 * Folosit pe pagina de detalii client (ClientPage) pentru a incarca toate informatiile.
 */
export async function getClient(id: string): Promise<Client> {
  return api<Client>(`/clients/${id}`);
}

/**
 * Creeaza un client nou in baza de date.
 *
 * @param data - Obiect cu campurile clientului (name, phone, email, location, etc.)
 * @returns Promise<Client> - Clientul creat cu ID-ul generat de server
 *
 * Campurile minime recomandate: name sau phone.
 */
export async function createClient(data: Record<string, unknown>): Promise<Client> {
  return api<Client>('/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Actualizeaza campuri specifice ale unui client existent.
 *
 * @param id   - ID-ul clientului de actualizat
 * @param data - Obiect cu campurile de modificat (partial update cu PATCH)
 * @returns Promise<Client> - Clientul actualizat
 *
 * Exemplu: await updateClient('id-123', { name: 'Ion Popescu', phone: '0722...' });
 * Nota: Se trimite doar campurile modificate, nu intregul obiect.
 */
export async function updateClient(id: string, data: Record<string, unknown>): Promise<Client> {
  return api<Client>(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Muta un client intr-o noua etapa a pipeline-ului de vanzari.
 *
 * @param id         - ID-ul clientului
 * @param stage      - Noua etapa (ex: 'Contactat', 'Oferta', 'Contractat', 'Pierdut')
 * @param lossReason - (optional) Motivul pierderii - obligatoriu cand stage = 'Pierdut'
 * @param lossNote   - (optional) Nota suplimentara despre pierdere
 * @returns Promise<Client> - Clientul actualizat cu noua etapa
 *
 * Aceasta functie este separata de updateClient pentru ca mutarea de etapa
 * poate declansa logica suplimentara pe server (notificari, loguri de activitate etc.)
 */
export async function moveClientStage(id: string, stage: string, lossReason?: string, lossNote?: string): Promise<Client> {
  return api<Client>(`/clients/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage, lossReason, lossNote }),
  });
}

/**
 * Sterge un client din baza de date.
 *
 * @param id - ID-ul clientului de sters
 *
 * ATENTIE: Aceasta actiune este ireversibila!
 * In interfata, se cere confirmare inainte de apelarea acestei functii.
 */
export async function deleteClient(id: string): Promise<void> {
  await api(`/clients/${id}`, { method: 'DELETE' });
}

/**
 * Importa un client nou dintr-un text brut de email.
 *
 * @param rawText  - Textul brut al email-ului (subiect + corp)
 * @param assignTo - (optional) ID-ul agentului caruia sa i se asigneze clientul
 * @returns Raspunsul serverului cu clientul creat
 *
 * Serverul foloseste procesare NLP/regex pentru a extrage:
 * - Numele clientului
 * - Numarul de telefon
 * - Locatia/adresa
 * - Suprafata si alte detalii tehnice
 */
export async function importEmail(rawText: string, assignTo?: string) {
  return api('/clients/import', {
    method: 'POST',
    body: JSON.stringify({ rawText, assignTo }),
  });
}

/**
 * Importa un lot de clienti din mai multe email-uri simultan.
 *
 * @param emails - Array de obiecte cu rawText (textul email-ului) si assignTo (optional)
 * @returns Raspunsul serverului cu clientii creati si eventualele erori
 *
 * Util pentru import in masa dintr-o casuta de email.
 */
export async function importBatch(emails: { rawText: string; assignTo?: string }[]) {
  return api('/clients/import/batch', {
    method: 'POST',
    body: JSON.stringify({ emails }),
  });
}

/**
 * Exporta toti clientii in format CSV.
 *
 * @returns Promise<string> - Continutul CSV ca text
 *
 * Raspunsul este text brut (nu JSON) - functia api() detecteaza Content-Type: text/csv
 * si returneaza textul direct. In interfata, se creeaza un Blob si se descarca ca fisier.
 */
export async function exportCsv(): Promise<string> {
  return api<string>('/clients/export/csv');
}
