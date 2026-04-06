/**
 * Rolurile disponibile pentru utilizatorii din sistem.
 *
 * - 'ADMIN' — Administrator al tenant-ului. Are acces complet la toate functiile:
 *   gestionare utilizatori, vizualizare dashboard, configurare setari, etc.
 * - 'SELLER' — Vanzator (agent de vanzari). Are acces doar la clientii atribuiti,
 *   la scripturile de vanzare si la propriile statistici.
 *
 * Rolul determina ce endpoint-uri API si ce pagini din interfata sunt accesibile.
 * Este stocat in token-ul JWT pentru autorizare rapida (vezi JwtPayload).
 */
export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT' | 'SELLER' | 'READONLY';

/**
 * Interfata principala care reprezinta un utilizator al sistemului CRM.
 *
 * Un utilizator apartine intotdeauna unui singur tenant (organizatie) si poate
 * avea rolul de administrator sau vanzator. Utilizatorii se autentifica prin
 * selectarea numelui si introducerea unui cod PIN (vezi LoginInput).
 *
 * Relatii cu alte tipuri:
 * - Client.assignedToId face referinta la User.id (vanzatorul atribuit)
 * - ActivityLog.userId, Call.userId, Resistance.userId fac referinta la User.id
 * - Target.userId face referinta la User.id (target-ul lunar al vanzatorului)
 */
export interface User {
  /** Identificator unic al utilizatorului (UUID generat de baza de date) */
  id: string;

  /** ID-ul tenant-ului (organizatiei) caruia ii apartine utilizatorul */
  tenantId: string;

  /** Numele complet al utilizatorului, afisat in interfata */
  name: string;

  /**
   * Adresa de email a utilizatorului.
   * Poate fi null deoarece autentificarea se face prin PIN, nu prin email.
   * Folosita optional pentru notificari.
   */
  email: string | null;

  /**
   * Rolul utilizatorului in sistem.
   * Determina permisiunile si accesul la functionalitati.
   * Vezi tipul UserRole pentru valorile posibile.
   */
  role: UserRole;

  /**
   * URL-ul sau calea catre avatarul (fotografia) utilizatorului.
   * Poate fi null daca utilizatorul nu si-a setat un avatar.
   * Afisat in interfata langa numele utilizatorului si in clasamentul vanzatorilor.
   */
  avatar: string | null;

  /**
   * Indica daca contul utilizatorului este activ.
   * Un cont dezactivat (false) nu se poate autentifica si nu apare
   * in listele de vanzatori disponibili pentru atribuire clienti.
   */
  isActive: boolean;

  /** Data la care a fost creat contul utilizatorului (format ISO 8601) */
  createdAt: string;

  /** Data ultimei actualizari a contului (format ISO 8601) */
  updatedAt: string;
}

/**
 * Interfata pentru datele necesare la crearea unui utilizator nou.
 *
 * Doar numele este obligatoriu. Celelalte campuri pot fi setate
 * ulterior prin actualizare (UpdateUserInput).
 * Folosita de administratori pentru a adauga vanzatori noi in echipa.
 */
export interface CreateUserInput {
  /** Numele complet al utilizatorului (obligatoriu) */
  name: string;

  /** Adresa de email (optional) */
  email?: string;

  /**
   * Codul PIN pentru autentificare (optional).
   * De obicei un cod numeric de 4-6 cifre.
   * Daca nu este specificat, utilizatorul nu va avea PIN setat initial.
   */
  pin?: string;

  /** Rolul utilizatorului (optional, implicit 'SELLER') */
  role?: UserRole;

  /** URL-ul sau calea catre avatarul utilizatorului (optional) */
  avatar?: string;
}

/**
 * Interfata pentru datele de actualizare a unui utilizator existent.
 *
 * Toate campurile sunt optionale — doar campurile trimise vor fi actualizate.
 * Campurile nespecificate raman neschimbate.
 * Folosita de administratori pentru a modifica datele unui utilizator.
 */
export interface UpdateUserInput {
  /** Noul nume al utilizatorului */
  name?: string;

  /** Noua adresa de email */
  email?: string;

  /** Noul cod PIN de autentificare */
  pin?: string;

  /** Noul rol al utilizatorului */
  role?: UserRole;

  /** Noul URL/cale catre avatar */
  avatar?: string;

  /**
   * Activeaza (true) sau dezactiveaza (false) contul utilizatorului.
   * Un cont dezactivat nu se poate autentifica.
   */
  isActive?: boolean;
}

/**
 * Interfata pentru datele de autentificare (login).
 *
 * Autentificarea in sistem se face prin selectarea utilizatorului (userId)
 * si introducerea codului PIN. Nu se folosesc parole sau email ca metoda de login.
 * Aceasta abordare simplifica fluxul pentru vanzatorii care lucreaza pe dispozitive partajate.
 */
export interface LoginInput {
  /** ID-ul utilizatorului care doreste sa se autentifice */
  userId: string;

  /**
   * Codul PIN al utilizatorului (optional).
   * Poate lipsi daca utilizatorul nu are PIN setat.
   */
  pin?: string;
}

/**
 * Interfata pentru perechea de token-uri JWT returnata dupa autentificare.
 *
 * Foloseste un model cu doua token-uri:
 * - accessToken — token cu durata scurta de viata, trimis in header-ul Authorization
 *   la fiecare cerere API
 * - refreshToken — token cu durata lunga de viata, folosit pentru a obtine
 *   un nou accessToken cand cel curent expira, fara a necesita re-autentificarea
 */
export interface AuthTokens {
  /**
   * Token-ul de acces JWT (durata scurta, ex: 15 minute).
   * Trimis ca 'Bearer <token>' in header-ul Authorization.
   */
  accessToken: string;

  /**
   * Token-ul de reimprospatare (durata lunga, ex: 7 zile).
   * Folosit pentru a obtine un nou accessToken fara re-autentificare.
   */
  refreshToken: string;
}

/**
 * Interfata pentru payload-ul (continutul decodat) al token-ului JWT.
 *
 * Aceste date sunt incluse in fiecare accessToken si sunt disponibile
 * pe server fara a interoga baza de date, permitand autorizarea rapida.
 * Folosita de middleware-ul de autentificare pentru a identifica utilizatorul
 * si a verifica permisiunile la fiecare cerere API.
 */
export interface JwtPayload {
  /** ID-ul utilizatorului autentificat */
  userId: string;

  /** ID-ul tenant-ului (organizatiei) — asigura izolarea datelor intre tenanti */
  tenantId: string;

  /**
   * Rolul utilizatorului — folosit pentru verificarea permisiunilor
   * fara a interoga baza de date la fiecare cerere.
   */
  role: UserRole;
}
