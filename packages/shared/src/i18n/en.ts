/**
 * ============================================================================
 * EN.TS — Traducerile in limba engleza pentru interfata CRM
 * ============================================================================
 *
 * Acest fisier contine toate string-urile afisate in interfata aplicatiei
 * cand limba selectata este engleza. Serveste ca alternativa la traducerea
 * principala in romana (ro.ts).
 *
 * Structura: obiect plat (cheie → valoare) de tip Record<string, string>.
 * Cheile sunt identice cu cele din ro.ts (traducerile in romana).
 * Ambele fisiere trebuie sa contina exact aceleasi chei pentru a evita
 * aparitia de texte lipsa in interfata.
 *
 * Folosit in: Sistemul de internationalizare (i18n) al frontend-ului.
 * Exportat prin barrel-ul principal (index.ts) ca `en`.
 * Frontend-ul selecteaza `ro` sau `en` in functie de preferinta utilizatorului.
 * ============================================================================
 */
export const en: Record<string, string> = {
  /** Butonul de deconectare din meniul utilizatorului */
  logout: 'Logout',

  /** Butonul de adaugare client nou (header pipeline / lista) */
  newClient: '+ New',

  /** Placeholder-ul campului de cautare clienti (bara de sus) */
  searchPlh: 'Search client...',

  /** Butonul de export al listei de clienti in format CSV */
  exportCsv: '\u2B07 CSV',

  /** Butonul de import clienti din email-uri (deschide dialogul de import) */
  importBtn: '\uD83D\uDCE7 Import',

  /** Eticheta tab-ului/meniului pentru pagina Dashboard (statistici si KPI-uri) */
  dashboard: 'Dashboard',

  /** Eticheta tab-ului/meniului pentru pagina Pipeline (vizualizare Kanban/Lista) */
  pipeline: 'Pipeline',

  /** Butonul de salvare din formularele de editare (fisa client, setari etc.) */
  save: 'Save',

  /** Butonul de anulare din formularele de editare */
  cancel: 'Cancel',

  /** Eticheta din ecranul de selectare cont (multi-tenant) */
  selectAccount: 'Select account',

  /** Butonul de creare cont nou (ecranul multi-tenant) */
  newAccount: '+ New account',

  /** Eticheta meniului de administrare utilizatori (vizibil doar admin) */
  users: '\uD83D\uDC65 Users',

  /** Linkul catre pagina de profil al utilizatorului curent */
  myProfile: 'My profile',

  /** Mesajul afisat in timpul incarcarii datelor (spinner/skeleton) */
  loading: 'Loading...',

  /** Avertismentul de duplicat potential la adaugarea unui client cu date similare */
  dupWarn: '\u26A0 Potential duplicate:',

  /** Mesajul din toast/snackbar dupa stergerea unui client */
  undoMsg: 'Client deleted.',

  /** Butonul de anulare stergere (undo) din toast/snackbar */
  undo: '\u21A9 Undo',

  /** Mesajul de confirmare dupa importul in masa al clientilor (ex: "15 clients imported") */
  batchDone: 'clients imported',

  /** Butonul care importa toate email-urile parsate din dialogul de import */
  importAll: 'Import all',

  /** Cuvantul "from" folosit in paginare sau contoare (ex: "3 from 10") */
  of: 'from',

  /** Eticheta pentru sectiunea/contorul de email-uri */
  emails: 'emails',

  /** Textul notificarii pentru apelurile programate azi (ex: "5 calls scheduled today") */
  notifCallsToday: ' calls scheduled today',

  /** Textul notificarii pentru clientii necontactati de 7+ zile (urgenti) */
  notifUrgent: ' clients not contacted 7+ days',

  /** Eticheta campului de introducere PIN (autentificare rapida) */
  enterPin: 'Enter PIN',

  /** Linkul de navigare inapoi la lista de conturi (ecranul multi-tenant) */
  backToAccounts: '\u2190 Back to accounts',

  /** Butonul de adaugare utilizator nou (pagina de administrare) */
  addUser: '+ Add user',

  /** Butonul de comutare la vizualizarea Kanban (pipeline) */
  kanbanView: '\u228E Kanban',

  /** Butonul de comutare la vizualizarea Lista (pipeline) */
  listView: '\u2630 List',

  /** Textul indicativ afisat in Kanban board (instructiune drag & drop) */
  dragHint: 'Drag cards between columns',

  /** Eticheta din formularul de creare utilizator nou */
  newUser: 'New account',

  /** Mesajul afisat cand niciun client nu corespunde filtrelor selectate */
  noResultsFilter: 'No clients match current filters.',

  /** Placeholder-ul campului de import email (textarea din dialogul de import) */
  importPlh: 'Paste received email... (separate multiple emails with ---)',
};
