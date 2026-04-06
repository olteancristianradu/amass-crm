/**
 * Interfata care reprezinta un pas din scriptul de vanzare telefonica.
 *
 * Fiecare etapa din pipeline (T1, T2, T3) are un script format din mai multi pasi.
 * Vanzatorul parcurge acesti pasi in ordine in timpul convorbirii telefonice cu clientul.
 * Pasii sunt afisati in interfata ca un checklist interactiv.
 *
 * Relatii cu alte tipuri:
 * - Client.t1Step, Client.t2Step, Client.t3Step stocheaza pasul curent (ScriptStep.id)
 * - Client.t1Checks, Client.t2Checks, Client.t3Checks marcheaza pasii completati
 */
export interface ScriptStep {
  /**
   * Identificatorul numeric al pasului (index in lista de pasi).
   * Folosit pentru a urmari progresul vanzatorului prin script.
   * Corespunde cu Client.t1Step / t2Step / t3Step.
   */
  id: number;

  /**
   * Titlul scurt al pasului, afisat in lista/checklist-ul de pasi.
   * Ex: 'Salut', 'Identificare nevoie', 'Prezentare solutie'
   */
  short: string;

  /**
   * Textul complet al pasului — replica sau instructiunile detaliate
   * pe care vanzatorul trebuie sa le urmeze in conversatie.
   * Poate contine HTML sau markdown pentru formatare.
   */
  full: string;
}

/**
 * Interfata care reprezinta o tipologie de cumparator (profil comportamental).
 *
 * Tipologiile sunt folosite pentru a clasifica clientii in functie de stilul lor
 * de comunicare si decizie, permitand vanzatorilor sa isi adapteze abordarea.
 * Vanzatorul selecteaza tipologia principala si secundara a clientului
 * in timpul convorbirii T1 (vezi Client.primaryType si Client.secondaryType).
 *
 * Exemple de tipologii: Analist, Expresiv, Amabil, Directiv.
 */
export interface Typology {
  /** Identificator unic al tipologiei (ex: 'analist', 'expresiv') */
  id: string;

  /**
   * Numele sau codul iconitei afisate in interfata.
   * Poate fi un emoji, un nume de icon din biblioteca de iconite, sau un cod.
   */
  icon: string;

  /** Numele afisat al tipologiei (ex: 'Analistul', 'Expresivul') */
  name: string;

  /**
   * Descrierea trasaturilor principale ale acestui tip de cumparator.
   * Ajuta vanzatorul sa identifice tipologia clientului.
   * Ex: 'Rational, orientat spre detalii, cauta date si dovezi'
   */
  traits: string;

  /**
   * Textul butonului de selectie afisat in interfata.
   * Text scurt care permite selectia rapida a tipologiei.
   */
  button: string;

  /**
   * O replica model sau un sfat de abordare adaptat acestei tipologii.
   * Sugereaza vanzatorului cum sa formuleze mesajele pentru acest tip de client.
   * Ex: 'Va prezint datele tehnice si studiile de caz...'
   */
  replica: string;

  /**
   * Culoarea asociata tipologiei (format hex sau nume CSS).
   * Folosita in interfata pentru identificare vizuala rapida.
   * Ex: '#2196F3' pentru Analist, '#FF9800' pentru Expresiv
   */
  color: string;
}

/**
 * Interfata pentru o intrare in jurnalul de activitate al unui client.
 *
 * Fiecare actiune importanta efectuata asupra unui client este inregistrata
 * ca o intrare in jurnalul de activitate: apeluri, schimbari de etapa,
 * note adaugate, atribuiri, etc. Jurnalul ofera o cronologie completa
 * a interactiunilor cu clientul.
 *
 * Relatii cu alte tipuri:
 * - ActivityLog.clientId face referinta la Client.id
 * - ActivityLog.userId face referinta la User.id (cine a efectuat actiunea)
 */
export interface ActivityLog {
  /** Identificator unic al intrarii in jurnal (UUID) */
  id: string;

  /** ID-ul clientului asociat acestei activitati */
  clientId: string;

  /** ID-ul utilizatorului care a efectuat actiunea */
  userId: string;

  /**
   * Mesajul descriptiv al activitatii.
   * Ex: 'A mutat clientul din T1 in T2', 'A adaugat nota', 'Apel de 5 minute'
   */
  message: string;

  /** Data si ora la care a fost inregistrata activitatea (format ISO 8601) */
  createdAt: string;
}

/**
 * Interfata care reprezinta un apel telefonic inregistrat in sistem.
 *
 * Fiecare convorbire telefonica cu un client este inregistrata pentru
 * urmarirea activitatii vanzatorilor si raportare (vezi DashboardKpis.callsToday).
 *
 * Relatii cu alte tipuri:
 * - Call.clientId face referinta la Client.id
 * - Call.userId face referinta la User.id (vanzatorul care a efectuat apelul)
 */
export interface Call {
  /** Identificator unic al apelului (UUID) */
  id: string;

  /** ID-ul clientului caruia i s-a facut apelul */
  clientId: string;

  /** ID-ul vanzatorului care a efectuat apelul */
  userId: string;

  /** Durata apelului in secunde */
  duration: number;

  /**
   * Etapa din pipeline in care se afla clientul in momentul apelului.
   * Permite analiza apelurilor pe fiecare etapa (ex: cate apeluri T1 vs T2).
   */
  stage: string;

  /** Data si ora la care a fost inregistrat apelul (format ISO 8601) */
  createdAt: string;
}

/**
 * Interfata care reprezinta o rezistenta (obiectie) exprimata de un client.
 *
 * Rezistentele sunt obiectiile pe care clientul le exprima in timpul procesului
 * de vanzare. Sunt inregistrate individual pentru analiza si raportare,
 * permitand identificarea celor mai frecvente obiectii si imbunatatirea scripturilor.
 *
 * Relatii cu alte tipuri:
 * - Resistance.clientId face referinta la Client.id
 * - Resistance.userId face referinta la User.id (vanzatorul care a inregistrat obiectia)
 * - Campurile Client.t1Resistances, t2Resistances, t3Resistances contin rezumate text
 */
export interface Resistance {
  /** Identificator unic al rezistentei (UUID) */
  id: string;

  /** ID-ul clientului care a exprimat obiectia */
  clientId: string;

  /** ID-ul vanzatorului care a inregistrat obiectia */
  userId: string;

  /**
   * Textul obiectiei exprimate de client.
   * Ex: 'Pretul este prea mare', 'Vreau sa mai gandesc', 'Am nevoie de alta oferta'
   */
  text: string;

  /**
   * Pasul sau etapa din script in care a aparut obiectia.
   * Ex: 'T1', 'T2-prezentare-pret', 'T3-oferta-finala'
   * Permite analiza la ce moment al conversatiei apar cele mai multe obiectii.
   */
  step: string;

  /** Data si ora la care a fost inregistrata obiectia (format ISO 8601) */
  createdAt: string;
}

/**
 * Interfata care reprezinta un target (obiectiv) lunar de vanzari.
 *
 * Fiecare vanzator poate avea un target lunar setat de administrator,
 * reprezentand numarul de contracte sau valoarea pe care trebuie sa o atinga.
 * Folosit in dashboard si in clasamentul vanzatorilor (LeaderboardEntry).
 *
 * Relatii cu alte tipuri:
 * - Target.tenantId face referinta la Tenant.id
 * - Target.userId face referinta la User.id (vanzatorul caruia ii este setat target-ul)
 * - LeaderboardEntry.target afiseaza target-ul curent al vanzatorului
 */
export interface Target {
  /** Identificator unic al target-ului (UUID) */
  id: string;

  /** ID-ul tenant-ului (organizatiei) */
  tenantId: string;

  /** ID-ul vanzatorului caruia ii este atribuit target-ul */
  userId: string;

  /**
   * Luna pentru care este setat target-ul (format 'YYYY-MM').
   * Ex: '2026-03' pentru martie 2026.
   */
  month: string;

  /**
   * Valoarea target-ului (numar de contracte sau valoare monetara).
   * Interpretat in functie de configuratia tenant-ului.
   */
  value: number;
}

/**
 * Interfata care reprezinta un sablon de mesaj predefinit.
 *
 * Sabloanele sunt mesaje pre-scrise pe care vanzatorii le pot trimite
 * clientilor (prin SMS, WhatsApp, email). Fiecare tenant isi poate defini
 * propriile sabloane pentru a standardiza comunicarea.
 *
 * Relatii cu alte tipuri:
 * - MessageTemplate.tenantId face referinta la Tenant.id
 */
export interface MessageTemplate {
  /** Identificator unic al sablonului (UUID) */
  id: string;

  /** ID-ul tenant-ului caruia ii apartine sablonul */
  tenantId: string;

  /**
   * Cheia unica a sablonului in cadrul tenant-ului.
   * Folosita pentru identificare programatica.
   * Ex: 'welcome_t1', 'followup_t2', 'offer_sent'
   */
  key: string;

  /**
   * Corpul mesajului (textul sablonului).
   * Poate contine placeholder-e care vor fi inlocuite cu datele clientului.
   * Ex: 'Buna ziua {{name}}, va multumim pentru interesul acordat...'
   */
  body: string;
}

/**
 * Interfata pentru indicatorii cheie de performanta (KPI) afisati pe dashboard.
 *
 * Contine toate datele agregate necesare pentru afisarea tabloului de bord:
 * statistici generale, distributie pe etape, rata de conversie,
 * prognoza vanzari si activitate zilnica.
 *
 * Aceste date sunt calculate pe server si returnate ca un singur obiect
 * pentru a minimiza numarul de cereri API din frontend.
 */
export interface DashboardKpis {
  /** Numarul total de clienti din pipeline (toate etapele, exclusiv Pierdut) */
  totalClients: number;

  /**
   * Distributia clientilor pe etape.
   * Cheia este numele etapei (ex: 'T1', 'T2'), valoarea este numarul de clienti.
   * Ex: { 'T1': 45, 'T2': 23, 'T3': 12, 'Contractat': 8 }
   */
  byStage: Record<string, number>;

  /** Numarul total de clienti contractati (in etapa 'Contractat') */
  contracted: number;

  /** Numarul total de clienti pierduti (in etapa 'Pierdut') */
  lost: number;

  /**
   * Rata de conversie (procentaj 0-100).
   * Calculata ca: (contractati / (contractati + pierduti)) * 100.
   * Indica eficienta generala a procesului de vanzare.
   */
  conversionRate: number;

  /**
   * Numarul mediu de zile de la crearea clientului pana la contractare.
   * Indica viteza procesului de vanzare.
   */
  avgDaysToClose: number;

  /**
   * Valoarea prognozata a vanzarilor (in moneda locala).
   * Calculata pe baza clientilor activi si a probabilitatii de conversie
   * asociata fiecarei etape.
   */
  forecastValue: number;

  /** Numarul de apeluri telefonice efectuate astazi */
  callsToday: number;

  /**
   * Numarul de clienti urgenti — clienti care necesita contactare imediata.
   * Un client este considerat urgent daca data din nextContact a fost depasita.
   */
  urgentClients: number;
}

/**
 * Interfata pentru o intrare in clasamentul (leaderboard-ul) vanzatorilor.
 *
 * Clasamentul afiseaza performanta fiecarui vanzator: contracte realizate,
 * clienti activi si progresul fata de target-ul lunar.
 * Folosit pe dashboard-ul administratorului pentru monitorizarea echipei.
 *
 * Relatii cu alte tipuri:
 * - LeaderboardEntry.userId face referinta la User.id
 * - LeaderboardEntry.target provine din Target.value pentru luna curenta
 */
export interface LeaderboardEntry {
  /** ID-ul vanzatorului */
  userId: string;

  /** Numele complet al vanzatorului (preluat din User.name) */
  userName: string;

  /** URL-ul avatarului vanzatorului (poate fi null, preluat din User.avatar) */
  avatar: string | null;

  /** Numarul de clienti contractati de acest vanzator in luna curenta */
  contracted: number;

  /** Numarul de clienti activi (in etapele T1, T2, T3) atribuiti acestui vanzator */
  active: number;

  /**
   * Target-ul lunar al vanzatorului (numar de contracte de atins).
   * Provine din Target.value pentru luna curenta.
   * Folosit pentru calculul procentajului de realizare afisat in interfata.
   */
  target: number;
}
