/**
 * Etapele pipeline-ului de vanzari prin care trece un client.
 *
 * - 'T1' — Prima convorbire telefonica (calificare initiala)
 * - 'T2' — A doua convorbire telefonica (prezentare solutie tehnica si pret)
 * - 'T3' — A treia convorbire telefonica (oferta finala, negociere, inchidere)
 * - 'Contractat' — Clientul a semnat contractul
 * - 'Pierdut' — Clientul a fost pierdut (nu mai este interesat sau a ales alt furnizor)
 *
 * Aceste etape sunt folosite pentru a urmari progresul fiecarui client in pipeline
 * si pentru a filtra/grupa clientii pe baza stadiului lor curent.
 */
export type Stage = 'T1' | 'T2' | 'T3' | 'Contractat' | 'Pierdut';

/**
 * Interfata principala care reprezinta un client in CRM.
 *
 * Un client este o persoana sau o companie interesata de achizitionarea unui sistem
 * de incalzire/energie (pompe de caldura, panouri solare, etc.).
 * Fiecare client apartine unui tenant (organizatie) si poate fi atribuit unui vanzator.
 *
 * Aceasta interfata contine toate datele colectate de-a lungul procesului de vanzare,
 * de la informatiile de baza pana la detaliile tehnice ale locuintei, consumul energetic,
 * notele din fiecare etapa a scriptului de vanzare si datele ofertei finale.
 */
export interface Client {
  /** Identificator unic al clientului (UUID generat de baza de date) */
  id: string;

  /** ID-ul tenant-ului (organizatiei) caruia ii apartine acest client */
  tenantId: string;

  /**
   * ID-ul vanzatorului caruia ii este atribuit clientul.
   * Poate fi null daca clientul nu a fost inca atribuit unui vanzator.
   */
  assignedToId: string | null;

  // --- Informatii de baza ---
  // Datele de contact si identificare ale clientului, colectate la prima interactiune.

  /** Numele complet al clientului (persoana fizica sau denumirea firmei) */
  name: string;

  /** Locatia clientului — oras, judet sau adresa (text liber) */
  location: string;

  /** Numarul de telefon al clientului */
  phone: string;

  /** Adresa de email a clientului */
  email: string;

  /**
   * Sursa din care a provenit lead-ul (ex: 'Facebook', 'Google Ads', 'Referral', 'Website').
   * Folosita pentru raportare si analiza canalelor de marketing.
   */
  source: string;

  // --- Pipeline ---
  // Pozitia clientului in procesul de vanzare.

  /**
   * Etapa curenta a clientului in pipeline-ul de vanzari.
   * Determina ce script si ce actiuni sunt disponibile pentru acest client.
   * Vezi tipul Stage pentru valorile posibile.
   */
  stage: Stage;

  /**
   * Scorul de calificare al clientului (0-100).
   * Un scor mai mare indica o probabilitate mai mare de conversie.
   * Se calculeaza automat pe baza datelor completate si a interactiunilor.
   */
  score: number;

  // --- Date despre locuinta ---
  // Informatii tehnice despre imobilul clientului, necesare pentru dimensionarea solutiei.

  /** Suprafata locuintei in metri patrati (text liber, ex: '120', '80-100') */
  area: string;

  /** Numarul de etaje ale locuintei (ex: '1', '2', 'P+1', 'P+M') */
  floors: string;

  /**
   * Tipul/tipurile de constructie ale locuintei.
   * Valori posibile: 'BCA', 'Caramida', 'Lemn', etc.
   * Este un array deoarece o locuinta poate avea constructie mixta.
   */
  construction: string[];

  /**
   * Tipul/tipurile de izolatie ale locuintei.
   * Valori posibile: 'Polistiren', 'Vata minerala', 'Fara izolatie', etc.
   * Este un array deoarece pot exista mai multe tipuri de izolatie aplicate.
   */
  insulation: string[];

  /**
   * Sistemul/sistemele actuale de incalzire ale clientului.
   * Valori posibile: 'Centrala pe gaz', 'Lemne', 'Calorifere electrice', 'Pompa de caldura', etc.
   * Este un array deoarece clientul poate avea mai multe sisteme.
   */
  currentSystem: string[];

  /**
   * Descriere suplimentara pentru sistemul actual, daca a fost selectat 'Altele'.
   * Camp text liber completat doar cand currentSystem include o optiune de tip "Altele".
   */
  currentSystemOther: string;

  /**
   * Utilitatile/retelele la care este conectata locuinta.
   * Valori posibile: 'Gaz', 'Curent trifazat', 'Curent monofazat', etc.
   */
  connectedTo: string[];

  // --- Consum energetic ---
  // Datele despre consumul actual de energie ale clientului, necesare pentru calcule tehnice.

  /**
   * Tipul de combustibil/energie consumat in prezent.
   * Valori posibile: 'Gaz', 'Lemne', 'Peleti', 'Curent', etc.
   */
  consumptionType: string;

  /** Cantitatea de consum (valoare numerica ca text, ex: '1500', '200') */
  consumptionAmount: string;

  /** Unitatea de masura a consumului (ex: 'mc', 'kWh', 'tone', 'steri') */
  consumptionUnit: string;

  /** Tipul de conexiune electrica (ex: 'Monofazat', 'Trifazat') */
  electricConnection: string;

  /** Puterea instalata a panourilor fotovoltaice in kWp (daca exista), ca text */
  pvPower: string;

  /** Informatii despre baterii de stocare (daca exista), text liber */
  batteries: string;

  /** Tipul/modelul invertorului fotovoltaic (daca exista), text liber */
  inverter: string;

  /** Productia anuala de energie din panouri fotovoltaice in kWh, ca text */
  annualProduction: string;

  /** Indica daca clientul are deja panouri solare instalate */
  hasSolarPanels: boolean;

  // --- Urmarire script T1 (Prima convorbire telefonica) ---
  // Aceste campuri urmaresc progresul vanzatorului prin scriptul de vanzare T1.

  /** Pasul curent din scriptul T1 la care a ajuns vanzatorul (index numeric, pornind de la 0) */
  t1Step: number;

  /**
   * Bifele (checkboxes) din scriptul T1.
   * Cheia este ID-ul pasului/actiunii, valoarea indica daca a fost bifat (completat).
   * Ex: { 'salut': true, 'identificare_nevoie': true, 'prezentare': false }
   */
  t1Checks: Record<string, boolean>;

  /**
   * Notele luate de vanzator in timpul convorbirii T1.
   * Cheia este ID-ul pasului/sectiunii, valoarea este textul notitei.
   * Ex: { 'observatii': 'Clientul este interesat dar are buget limitat' }
   */
  t1Notes: Record<string, string>;

  // --- Profilare client ---
  // Informatii despre profilul psihologic si comportamental al clientului,
  // colectate in timpul convorbirii T1 pentru a adapta strategia de vanzare.

  /**
   * Nivelul de buget al clientului.
   * Valori posibile: 'Mic', 'Mediu', 'Mare' sau alte niveluri definite in script.
   */
  budgetLevel: string;

  /**
   * Tipologia principala a clientului (profilul dominant de comportament).
   * Se refera la tipologiile de cumparatori definite in pipeline.ts (vezi interfata Typology).
   * Ex: 'analist', 'expresiv', 'amabil', 'directiv'
   */
  primaryType: string;

  /**
   * Tipologia secundara a clientului (profilul secundar de comportament).
   * Folosita impreuna cu primaryType pentru a personaliza abordarea de vanzare.
   */
  secondaryType: string;

  /** Reactia pozitiva a clientului in timpul convorbirii T1 (text liber sau optiune predefinita) */
  positiveReaction: string;

  /**
   * Rezistentele/obiectiile exprimate de client in timpul convorbirii T1.
   * Text liber care sumarizeaza principalele obiectii.
   */
  t1Resistances: string;

  // --- Date T2 (A doua convorbire telefonica) ---
  // Informatiile colectate in timpul convorbirii T2: prezentarea solutiei tehnice si a pretului.

  /** Pasul curent din scriptul T2 la care a ajuns vanzatorul */
  t2Step: number;

  /** Bifele din scriptul T2 — analog cu t1Checks */
  t2Checks: Record<string, boolean>;

  /** Notele din scriptul T2 — analog cu t1Notes */
  t2Notes: Record<string, string>;

  /**
   * Intervalul de timp in care clientul doreste sa implementeze solutia.
   * Ex: 'Imediat', '1-3 luni', '6 luni', 'Anul viitor'
   */
  timeline: string;

  /** Solutia tehnica propusa clientului (text liber sau cod solutie) */
  technicalSolution: string;

  /**
   * Reactia clientului la pretul prezentat in T2.
   * Ex: 'Pozitiva', 'Neutra', 'Negativa', sau text liber.
   */
  priceReaction: string;

  /** Rezistentele/obiectiile clientului din convorbirea T2 */
  t2Resistances: string;

  // --- Date T3 (A treia convorbire telefonica — oferta finala) ---
  // Informatiile colectate in timpul convorbirii T3: oferta finala, negociere si incheiere.

  /** Pasul curent din scriptul T3 la care a ajuns vanzatorul */
  t3Step: number;

  /** Bifele din scriptul T3 — analog cu t1Checks */
  t3Checks: Record<string, boolean>;

  /** Notele din scriptul T3 — analog cu t1Notes */
  t3Notes: Record<string, string>;

  /** Consumul calculat pe baza datelor tehnice (in kWh sau alta unitate, ca text) */
  calculatedConsumption: string;

  /** Puterea instalata propusa pentru solutia tehnica (in kW, ca text) */
  installedPower: string;

  /** Suma totala oferita clientului (pretul ofertei, ca text) */
  offeredAmount: string;

  /**
   * Varianta de plata aleasa de client.
   * Ex: 'Rate', 'Integral', 'Avans + rate'
   */
  paymentVariant: string;

  /** Suma lunara a ratei (daca plata este in rate, ca text) */
  installmentAmount: string;

  /** Suma totala de plata integrala (ca text) */
  fullPaymentAmount: string;

  /** Suma avansului solicitat (ca text) */
  depositAmount: string;

  /**
   * Reactia clientului la oferta finala din T3.
   * Ex: 'Accepta', 'Negociaza', 'Refuza'
   */
  offerReaction: string;

  /** Rezistentele/obiectiile clientului din convorbirea T3 */
  t3Resistances: string;

  // --- Pierdere ---
  // Campuri completate cand clientul ajunge in stadiul 'Pierdut'.

  /**
   * Motivul pentru care clientul a fost pierdut.
   * Ex: 'Pret prea mare', 'A ales concurenta', 'Nu mai este interesat', etc.
   */
  lossReason: string;

  /** Nota suplimentara despre pierderea clientului (text liber) */
  lossNote: string;

  // --- Programare ---
  // Gestionarea urmatoarei interactiuni cu clientul.

  /**
   * Data si ora urmatoarei contactari programate (format ISO 8601).
   * Poate fi null daca nu exista o programare activa.
   * Folosita pentru alerte si prioritizarea clientilor.
   */
  nextContact: string | null;

  // --- Metadate import ---
  // Campuri folosite cand clientul a fost importat dintr-o sursa externa (formular, CSV, etc.).

  /** Nota adaugata la importul clientului din sursa externa */
  importNote: string;

  /** Notele din formularul original de unde a fost importat clientul */
  formNotes: string;

  // --- Fisa Client T1 ---
  // Date structurate colectate prin formularul "Fisa Client" in etapa T1.

  /**
   * Datele din fisa clientului completata in T1.
   * Poate fi null daca fisa nu a fost inca completata.
   * Vezi interfata FisaData pentru structura detaliata.
   */
  fisaData: FisaData | null;

  /** Data la care a fost creat clientul in sistem (format ISO 8601) */
  createdAt: string;

  /** Data ultimei actualizari a datelor clientului (format ISO 8601) */
  updatedAt: string;
}

/**
 * Interfata pentru datele din "Fisa Client" — un formular structurat completat
 * de vanzator in timpul primei convorbiri telefonice (T1).
 *
 * Fisa Client este un rezumat al informatiilor esentiale ale clientului,
 * colectate intr-un format standardizat. Multe campuri se suprapun cu cele
 * din interfata Client, dar FisaData reprezinta un snapshot al datelor
 * asa cum au fost completate in momentul convorbirii T1.
 *
 * Proprietatea [key: string]: unknown permite stocarea de campuri suplimentare
 * care nu sunt definite explicit, oferind flexibilitate pentru personalizari viitoare.
 */
export interface FisaData {
  /** Numele clientului asa cum a fost completat in fisa */
  clientName: string;

  /** Locatia clientului (oras, judet) */
  location: string;

  /** Numarul de telefon */
  phone: string;

  /** Adresa de email */
  email: string;

  /** Suprafata locuintei in metri patrati */
  area: string;

  /** Numarul de etaje */
  floors: string;

  /** Tipul/tipurile de constructie (vezi Client.construction) */
  construction: string[];

  /** Tipul/tipurile de izolatie (vezi Client.insulation) */
  insulation: string[];

  /** Sistemul/sistemele actuale de incalzire (vezi Client.currentSystem) */
  currentSystem: string[];

  /** Utilitatile/retelele la care este conectata locuinta (vezi Client.connectedTo) */
  connectedTo: string[];

  /** Cantitatea de consum energetic */
  consumptionAmount: string;

  /** Tipul de combustibil/energie consumat */
  consumptionType: string;

  /** Indica daca clientul are panouri solare */
  hasSolarPanels: boolean;

  /** Puterea panourilor fotovoltaice in kWp (daca exista) */
  pvPower: string;

  /** Note suplimentare din fisa */
  notes: string;

  /** Permite campuri suplimentare nedefinite explicit */
  [key: string]: unknown;
}

/**
 * Interfata pentru filtrele aplicate la cautarea si listarea clientilor.
 *
 * Toate campurile sunt optionale — daca un camp nu este specificat,
 * nu se aplica niciun filtru pe acel criteriu.
 * Folosita in endpoint-urile de listare si in interfata de cautare din frontend.
 */
export interface ClientFilters {
  /** Termen de cautare libera — cauta in numele, telefonul si emailul clientului */
  search?: string;

  /** Filtreaza dupa etapa din pipeline (ex: doar clientii in 'T1') */
  stage?: Stage;

  /** Filtreaza dupa vanzatorul atribuit (ID-ul utilizatorului) */
  assignedToId?: string;

  /**
   * Filtru de urgenta:
   * - 'urgent' — clienti care necesita contactare imediata (nextContact depasit)
   * - 'stale' — clienti care nu au fost contactati de mult timp
   */
  urgency?: 'urgent' | 'stale';

  /** Filtreaza clientii care au panouri solare (true) sau nu au (false) */
  hasSolar?: boolean;

  /**
   * Campul si directia de sortare.
   * Format: 'camp:directie' (ex: 'createdAt:desc', 'name:asc', 'score:desc')
   */
  sort?: string;

  /** Numarul paginii curente pentru paginare (pornind de la 1) */
  page?: number;

  /** Numarul de rezultate pe pagina */
  limit?: number;
}

/**
 * Interfata pentru datele necesare la crearea unui client nou.
 *
 * Doar numele este obligatoriu — restul campurilor sunt optionale
 * si pot fi completate ulterior pe masura ce se colecteaza informatii.
 *
 * Proprietatea [key: string]: unknown permite trimiterea de campuri
 * suplimentare care vor fi salvate pe obiectul clientului.
 */
export interface CreateClientInput {
  /** Numele clientului (obligatoriu) */
  name: string;

  /** Numarul de telefon (optional) */
  phone?: string;

  /** Adresa de email (optional) */
  email?: string;

  /** Locatia clientului (optional) */
  location?: string;

  /** Sursa lead-ului (optional, ex: 'Facebook', 'Website') */
  source?: string;

  /** Etapa initiala in pipeline (optional, implicit 'T1') */
  stage?: Stage;

  /** ID-ul vanzatorului caruia ii este atribuit (optional) */
  assignedToId?: string;

  /** Suprafata locuintei (optional) */
  area?: string;

  /** Permite campuri suplimentare nedefinite explicit */
  [key: string]: unknown;
}

/**
 * Interfata pentru importul unui client din email.
 *
 * Textul brut al emailului este procesat automat pentru a extrage
 * informatiile clientului (nume, telefon, email, locatie, etc.).
 * Folosita cand lead-urile vin prin formulare web care trimit notificari pe email.
 */
export interface ImportEmailInput {
  /**
   * Textul brut al emailului care contine datele clientului.
   * Va fi parsat automat de server pentru a extrage campurile relevante.
   */
  rawText: string;

  /**
   * ID-ul vanzatorului caruia ii va fi atribuit clientul importat.
   * Optional — daca nu este specificat, clientul ramane neatribuit.
   */
  assignTo?: string;
}
