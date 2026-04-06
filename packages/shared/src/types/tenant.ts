/**
 * Planurile de abonament disponibile pentru un tenant (organizatie).
 *
 * - 'free' — Plan gratuit cu functionalitati de baza si limite reduse
 * - 'pro' — Plan platit cu functionalitati avansate (rapoarte, integrari, etc.)
 * - 'enterprise' — Plan enterprise cu functionalitati complete si suport dedicat
 *
 * Planul determina limitele de utilizare (numar de utilizatori, clienti, etc.)
 * si functiile disponibile in interfata.
 */
export type Plan = 'free' | 'pro' | 'enterprise';

/**
 * Interfata principala care reprezinta un tenant (organizatie/companie) in sistem.
 *
 * CRM-ul este multi-tenant: fiecare organizatie isi are propriile date izolate.
 * Un tenant poate avea mai multi utilizatori (User) si clienti (Client).
 * Toate datele din sistem (clienti, utilizatori, activitati, target-uri, etc.)
 * sunt filtrate automat dupa tenantId pentru a asigura izolarea completa.
 *
 * Relatii cu alte tipuri:
 * - User.tenantId face referinta la Tenant.id
 * - Client.tenantId face referinta la Tenant.id
 * - Target.tenantId si MessageTemplate.tenantId fac referinta la Tenant.id
 */
export interface Tenant {
  /** Identificator unic al tenant-ului (UUID generat de baza de date) */
  id: string;

  /** Numele afisat al organizatiei (ex: 'Amass Energy SRL') */
  name: string;

  /**
   * Identificator unic in format URL-friendly (slug).
   * Folosit in URL-uri si ca identificator uman-lizibil.
   * Ex: 'amass-energy', 'solar-tech'
   * Trebuie sa fie unic in intregul sistem.
   */
  slug: string;

  /**
   * Planul de abonament activ al tenant-ului.
   * Determina functiile si limitele disponibile.
   * Vezi tipul Plan pentru valorile posibile.
   */
  plan: Plan;

  /**
   * Setarile de personalizare ale tenant-ului.
   * Permit configurarea aspectului si comportamentului aplicatiei
   * pentru fiecare organizatie in parte.
   * Vezi interfata TenantSettings pentru detalii.
   */
  settings: TenantSettings;

  /** Data la care a fost creat tenant-ul in sistem (format ISO 8601) */
  createdAt: string;

  /** Data ultimei actualizari a datelor tenant-ului (format ISO 8601) */
  updatedAt: string;
}

/**
 * Interfata pentru setarile de personalizare ale unui tenant.
 *
 * Permite fiecarei organizatii sa isi configureze aplicatia conform necesitatilor:
 * culori de brand, limba implicita, etape personalizate de pipeline, etc.
 * Toate campurile sunt optionale — daca nu sunt specificate, se folosesc valorile implicite.
 */
export interface TenantSettings {
  /**
   * Culoarea de accent principala a brandului (format hex, ex: '#FF6B00').
   * Folosita pentru butoane, link-uri si elemente interactive in interfata.
   */
  accentColor?: string;

  /**
   * Varianta inchisa a culorii de accent (format hex, ex: '#CC5500').
   * Folosita pentru stari hover, borduri si elemente care necesita contrast mai mare.
   */
  accentDark?: string;

  /**
   * Limba implicita a interfetei pentru utilizatorii tenant-ului.
   * - 'ro' — Romana (implicit)
   * - 'en' — Engleza
   */
  defaultLanguage?: 'ro' | 'en';

  /**
   * Lista de etape personalizate ale pipeline-ului de vanzari.
   * Daca este specificata, inlocuieste etapele implicite (T1, T2, T3, etc.)
   * cu etapele definite de tenant.
   * Ex: ['Prospectare', 'Calificare', 'Oferta', 'Negociere', 'Castigat']
   */
  customStages?: string[];

  /**
   * Lista de motive personalizate pentru pierderea clientilor.
   * Daca este specificata, aceste motive vor fi disponibile in dropdown-ul
   * de selectie cand un client este marcat ca 'Pierdut'.
   * Ex: ['Pret prea mare', 'A ales concurenta', 'Proiect amanat', 'Nu raspunde']
   */
  customLossReasons?: string[];
}

/**
 * Interfata pentru datele necesare la crearea unui tenant nou.
 *
 * Numele si slug-ul sunt obligatorii. Planul este optional
 * si implicit va fi 'free'.
 * Folosita la inregistrarea unei organizatii noi in sistem.
 */
export interface CreateTenantInput {
  /** Numele organizatiei (obligatoriu) */
  name: string;

  /**
   * Slug-ul unic al organizatiei (obligatoriu).
   * Trebuie sa fie URL-friendly (litere mici, cifre, cratime).
   * Ex: 'amass-energy'
   */
  slug: string;

  /** Planul de abonament initial (optional, implicit 'free') */
  plan?: Plan;
}
