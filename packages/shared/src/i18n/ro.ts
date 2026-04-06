/**
 * ============================================================================
 * RO.TS — Traducerile in limba romana pentru interfata CRM
 * ============================================================================
 *
 * Acest fisier contine toate string-urile afisate in interfata aplicatiei
 * cand limba selectata este romana. Este limba principala a CRM-ului,
 * deoarece AMASS opereaza predominant pe piata romaneasca.
 *
 * Structura: obiect plat (cheie → valoare) de tip Record<string, string>.
 * Cheile sunt identice cu cele din en.ts (traducerile in engleza).
 *
 * Folosit in: Sistemul de internationalizare (i18n) al frontend-ului.
 * Exportat prin barrel-ul principal (index.ts) ca `ro`.
 * Frontend-ul selecteaza `ro` sau `en` in functie de preferinta utilizatorului
 * si foloseste cheile pentru a afisa textul corespunzator.
 * ============================================================================
 */
export const ro: Record<string, string> = {
  /** Butonul de deconectare din meniul utilizatorului */
  logout: 'Logout',

  /** Butonul de adaugare client nou (header pipeline / lista) */
  newClient: '+ Nou',

  /** Placeholder-ul campului de cautare clienti (bara de sus) */
  searchPlh: 'Cauta client...',

  /** Butonul de export al listei de clienti in format CSV */
  exportCsv: '\u2B07 CSV',

  /** Butonul de import clienti din email-uri (deschide dialogul de import) */
  importBtn: '\uD83D\uDCE7 Import',

  /** Eticheta tab-ului/meniului pentru pagina Dashboard (statistici si KPI-uri) */
  dashboard: 'Dashboard',

  /** Eticheta tab-ului/meniului pentru pagina Pipeline (vizualizare Kanban/Lista) */
  pipeline: 'Pipeline',

  /** Butonul de salvare din formularele de editare (fisa client, setari etc.) */
  save: 'Salveaza',

  /** Butonul de anulare din formularele de editare */
  cancel: 'Anuleaza',

  /** Eticheta din ecranul de selectare cont (multi-tenant) */
  selectAccount: 'Selecteaza contul',

  /** Butonul de creare cont nou (ecranul multi-tenant) */
  newAccount: '+ Cont nou',

  /** Eticheta meniului de administrare utilizatori (vizibil doar admin) */
  users: '\uD83D\uDC65 Utilizatori',

  /** Linkul catre pagina de profil al utilizatorului curent */
  myProfile: 'Profilul meu',

  /** Mesajul afisat in timpul incarcarii datelor (spinner/skeleton) */
  loading: 'Se incarca...',

  /** Avertismentul de duplicat potential la adaugarea unui client cu date similare */
  dupWarn: '\u26A0 Duplicat potential:',

  /** Mesajul din toast/snackbar dupa stergerea unui client */
  undoMsg: 'Client sters.',

  /** Butonul de anulare stergere (undo) din toast/snackbar */
  undo: '\u21A9 Undo',

  /** Mesajul de confirmare dupa importul in masa al clientilor (ex: "15 clienti importati") */
  batchDone: 'clienti importati',

  /** Butonul care importa toate email-urile parsate din dialogul de import */
  importAll: 'Importa toate',

  /** Cuvantul "din" folosit in paginare sau contoare (ex: "3 din 10") */
  of: 'din',

  /** Eticheta pentru sectiunea/contorul de email-uri */
  emails: 'emailuri',

  /** Textul notificarii pentru apelurile programate azi (ex: "5 apeluri programate azi") */
  notifCallsToday: ' apeluri programate azi',

  /** Textul notificarii pentru clientii necontactati de 7+ zile (urgenti) */
  notifUrgent: ' clienti necontactati 7+ zile',

  /** Eticheta campului de introducere PIN (autentificare rapida) */
  enterPin: 'Introdu PIN-ul',

  /** Linkul de navigare inapoi la lista de conturi (ecranul multi-tenant) */
  backToAccounts: '\u2190 Inapoi la conturi',

  /** Butonul de adaugare utilizator nou (pagina de administrare) */
  addUser: '+ Adauga utilizator',

  /** Butonul de comutare la vizualizarea Kanban (pipeline) */
  kanbanView: '\u228E Kanban',

  /** Butonul de comutare la vizualizarea Lista (pipeline) */
  listView: '\u2630 Lista',

  /** Textul indicativ afisat in Kanban board (instructiune drag & drop) */
  dragHint: 'Trage carduri intre coloane',

  /** Eticheta din formularul de creare utilizator nou */
  newUser: 'Cont nou',

  /** Mesajul afisat cand niciun client nu corespunde filtrelor selectate */
  noResultsFilter: 'Niciun client cu filtrele selectate.',

  /** Placeholder-ul campului de import email (textarea din dialogul de import) */
  importPlh: 'Paste email-ul primit... (separa multiple emailuri cu ---)',
};
