/**
 * Modul de parsare a email-urilor primite de la formularele web.
 *
 * Acest modul extrage date structurate (nume, email, telefon, locatie, sistem de
 * incalzire, consum lunar etc.) din textul brut al email-urilor trimise automat
 * de formularele de contact ale site-ului. Formularele genereaza email-uri cu
 * perechi "Eticheta: valoare" sau "Eticheta\nvaloare" pe linii separate.
 *
 * Datele extrase sunt folosite pentru a crea automat inregistrari de clienti noi
 * in CRM, reducand munca manuala de introducere a datelor de catre agentii de vanzari.
 *
 * Formatul asteptat al email-urilor:
 * - Linii de tip "Prenume: Ion" sau "Prenume\nIon"
 * - Intrebari despre sistem de incalzire, consum, panouri solare etc.
 * - Note suplimentare si preferinte de sistem
 */

import { san, sanTel, sanEmail } from './sanitize';

/**
 * Interfata care defineste structura datelor extrase dintr-un email parsat.
 *
 * Fiecare camp corespunde unei informatii relevante pentru crearea unui client
 * in sistemul CRM:
 *
 * @property name - Numele complet al clientului (prenume + nume)
 * @property email - Adresa de email a clientului
 * @property phone - Numarul de telefon al clientului
 * @property area - Suprafata locuintei (in mp)
 * @property location - Orasul sau locatia clientului
 * @property hasSolarPanels - Daca clientul are deja panouri fotovoltaice
 * @property consumptionAmount - Suma platita lunar pe incalzire (in RON)
 * @property currentSystem - Sistemul actual de incalzire (de ex. centrala gaz, lemne)
 * @property stage - Stadiul/varianta aleasa de client
 * @property formNotes - Note suplimentare si intrebari din formular
 * @property desiredSystem - Sistemul de incalzire dorit de client
 * @property monthlyPayment - Suma pe care doreste sa o plateasca lunar
 */
export interface ParsedEmail {
  name: string;
  email: string;
  phone: string;
  area: string;
  location: string;
  hasSolarPanels: boolean;
  consumptionAmount: string;
  currentSystem: string;
  stage: string;
  formNotes: string;
  desiredSystem: string;
  monthlyPayment: string;
}

/**
 * Normalizeaza un string pentru comparatie insensibila la diacritice si majuscule.
 *
 * Algoritm:
 * 1. Daca input-ul este falsy (null, undefined, ''), porneste cu string gol.
 * 2. Aplica normalizarea Unicode NFD — descompune caracterele cu diacritice
 *    in caracterul de baza + semnul diacritic separat (de ex. "ă" → "a" + "̆").
 * 3. Elimina toate semnele diacritice (intervalul Unicode 0300-036f),
 *    ramanand doar caracterele de baza (de ex. "Suprafață" → "Suprafata").
 * 4. Converteste totul la litere mici (lowercase).
 * 5. Inlocuieste orice caracter care nu este litera, cifra sau spatiu cu un spatiu.
 * 6. Comprima spatiile multiple consecutive intr-un singur spatiu.
 * 7. Aplica trim() pentru a elimina spatiile de la margini.
 *
 * @param s - String-ul de normalizat.
 * @returns String-ul normalizat — fara diacritice, lowercase, doar litere/cifre/spatii.
 *
 * Utilizare in CRM: Folosita intern de functia val() pentru a compara etichetele
 * din email cu cele cautate, indiferent de diacritice sau majuscule.
 * De exemplu, "Suprafață:" si "suprafata:" vor fi considerate identice.
 */
function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parseaza textul brut al unui email si extrage datele structurate ale clientului.
 *
 * Aceasta este functia principala a modulului. Primeste textul complet al unui email
 * generat de formularul web si returneaza un obiect ParsedEmail cu toate campurile
 * extrase si sanitizate.
 *
 * Algoritmul general:
 * 1. Truncheaza textul la 10.000 de caractere (protectie impotriva email-urilor enorme).
 * 2. Imparte textul in linii, elimina liniile goale si spatiile de la margini.
 * 3. Foloseste functia interna val() pentru a extrage campurile simple (prenume, nume,
 *    email, telefon, suprafata, oras).
 * 4. Foloseste cautari specifice bazate pe cuvinte cheie pentru campurile complexe
 *    (consum, sistem actual, stadiu, note, sistem dorit, plata lunara).
 * 5. Sanitizeaza toate valorile extrase prin functiile din sanitize.ts.
 *
 * @param rawText - Textul brut al email-ului, asa cum a fost primit.
 * @returns Obiect ParsedEmail cu toate campurile extrase si sanitizate.
 *
 * Cazuri limita tratate:
 * - rawText null/undefined → tratat ca string gol
 * - Email foarte lung (>10.000 caractere) → trunchiat
 * - Campuri lipsa din email → returnate ca string gol sau false
 * - Etichete cu sau fara diacritice → normalizate prin norm()
 * - Valori pe aceeasi linie cu eticheta ("Prenume: Ion") sau pe linia urmatoare
 */
export function parseEmail(rawText: string): ParsedEmail {
  /**
   * Truncheaza textul la 10.000 de caractere pentru a preveni procesarea
   * unor email-uri excesiv de mari (protectie de performanta si securitate).
   */
  const text = (rawText || '').slice(0, 10000);

  /**
   * Imparte textul in linii individuale, elimina spatiile de la margini
   * si filtreaza liniile complet goale. Rezultatul este un array de linii
   * non-vide care vor fi parcurse pentru extragerea datelor.
   */
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  /**
   * Functie interna pentru extragerea valorii unui camp dupa eticheta sa.
   *
   * Algoritmul de cautare:
   * 1. Parcurge lista de etichete exacte primite (exactLabels).
   * 2. Pentru fiecare eticheta, normalizeaza-o si cauta in toate liniile email-ului.
   * 3. O potrivire este gasita daca:
   *    a) Linia normalizata este identica cu eticheta normalizata (isExact), SAU
   *    b) Linia normalizata incepe cu eticheta si linia originala contine ':' (hasColon).
   * 4. Daca linia contine ':', extrage valoarea de dupa primul ':' si o returneaza
   *    daca nu este goala (de ex. "Prenume: Ion" → "Ion").
   * 5. Daca valoarea de dupa ':' este goala sau linia nu contine ':', cauta in
   *    urmatoarele 3 linii (i+1 pana la i+3) prima linie non-vida — aceasta
   *    este valoarea campului (format "Eticheta\nValoare").
   * 6. Toate valorile returnate sunt sanitizate prin san().
   *
   * @param exactLabels - Array de etichete de cautat (de ex. ['Prenume'], ['Suprafata', 'Suprafat']).
   *                      Se pot specifica mai multe variante pentru a trata diferite
   *                      formate ale formularului (cu/fara diacritice, prescurtari).
   * @returns Valoarea gasita si sanitizata, sau string gol daca nu a fost gasita.
   */
  function val(exactLabels: string[]): string {
    for (const lbl of exactLabels) {
      const lblN = norm(lbl);
      for (let i = 0; i < lines.length; i++) {
        const lineN = norm(lines[i]);

        /* Verificam daca linia este exact eticheta cautata */
        const isExact = lineN === lblN;

        /* Verificam daca linia incepe cu eticheta si contine ':' (format "Eticheta: valoare") */
        const hasColon = lineN.startsWith(lblN) && lines[i].includes(':');

        if (!isExact && !hasColon) continue;

        /* Daca linia contine ':', extragem valoarea de dupa primul ':' */
        if (lines[i].includes(':')) {
          const ci = lines[i].indexOf(':');
          const v = lines[i].slice(ci + 1).trim();
          if (v.length > 0) return san(v);
        }

        /*
         * Daca nu am gasit valoare dupa ':', cautam in urmatoarele 3 linii.
         * Acest caz trateaza formatul in care eticheta si valoarea sunt pe linii separate:
         * "Prenume"
         * "Ion"
         */
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          if (lines[j] && lines[j].trim().length > 0) return san(lines[j]);
        }
      }
    }
    return '';
  }

  /*
   * ==========================================
   * EXTRAGERE NUME COMPLET
   * ==========================================
   * Extrage prenumele si numele separat, apoi le combina.
   * Daca ambele sunt prezente si diferite, le concateneaza cu spatiu.
   * Daca doar unul este prezent, il foloseste pe acela.
   * Verificarea prenume !== nume previne duplicarea in cazul in care
   * ambele campuri contin aceeasi valoare (eroare de formular).
   */
  const prenume = val(['Prenume']);
  const nume = val(['Nume']);
  let name = '';
  if (prenume && nume && prenume !== nume) name = prenume + ' ' + nume;
  else if (prenume) name = prenume;
  else name = nume;

  /*
   * ==========================================
   * EXTRAGERE CAMPURI SIMPLE
   * ==========================================
   * Aceste campuri sunt extrase direct prin val() cu etichetele corespunzatoare.
   * sanEmail() si sanTel() aplica sanitizare suplimentara specifica tipului de date.
   * Etichetele multiple (de ex. ['Suprafata', 'Suprafat']) trateaza variatii
   * ale formularului (cu/fara ultimul caracter, diacritice diferite).
   */
  const email = sanEmail(val(['Email']));
  const phone = sanTel(val(['Telefon']));
  const area = val(['Suprafata', 'Suprafat']);
  const location = val(['Oras', 'Ora']);

  /*
   * Detectam prezenta panourilor fotovoltaice prin cautare in textul complet.
   * Nu depinde de o eticheta specifica — orice mentiune de "panouri fotovoltaice"
   * in email este suficienta. Cautarea este case-insensitive (/i).
   */
  const hasSolarPanels = /panouri fotovoltaice/i.test(text);

  /*
   * ==========================================
   * EXTRAGERE SUMA CONSUM LUNAR INCALZIRE
   * ==========================================
   * Algoritmul are doua strategii de cautare (fallback):
   *
   * Strategia 1: Cautare dupa cuvinte cheie
   * - Cauta o linie care contine simultan "platiti", "luna" si "incalzire"
   *   (intrebarea tipica: "Cat platiti pe luna pe incalzire?")
   * - Daca linia contine ':', extrage valoarea de dupa ultimul ':' (daca contine cifre)
   * - Altfel, cauta in urmatoarele 2 linii prima valoare care contine cifre
   *
   * Strategia 2: Cautare pattern "RON" (fallback)
   * - Daca strategia 1 nu a gasit nimic, cauta orice aparitie de "123 RON" sau
   *   "1.234,56 RON" in textul complet
   * - Foloseste prima aparitie gasita
   */
  let consumptionAmount = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('platiti') && l.includes('luna') && l.includes('incalzire')) {
      /* Incercam sa extragem valoarea de dupa ultimul ':' din aceeasi linie */
      if (lines[i].includes(':')) {
        const v = lines[i].slice(lines[i].lastIndexOf(':') + 1).trim();
        if (v.length > 0 && v.match(/\d/)) { consumptionAmount = san(v); continue; }
      }
      /* Cautam in urmatoarele 2 linii o valoare care contine cifre */
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (lines[j] && lines[j].trim().match(/\d/)) { consumptionAmount = san(lines[j]); break; }
      }
      break;
    }
  }
  /* Fallback: cautam pattern-ul "numar RON" in textul complet */
  if (!consumptionAmount) {
    const rons = text.match(/([\d.,]+)\s*RON/gi);
    if (rons) consumptionAmount = san(rons[0]);
  }

  /*
   * ==========================================
   * EXTRAGERE SISTEM ACTUAL DE INCALZIRE
   * ==========================================
   * Algoritmul are doua strategii de cautare (fallback):
   *
   * Strategia 1: Cautare dupa cuvinte cheie
   * - Cauta o linie care contine simultan "sistem", "incalzire" si "acum"
   *   (intrebarea tipica: "Ce sistem de incalzire aveti acum?")
   * - Extrage valoarea de dupa ultimul ':' sau din urmatoarele 2 linii
   * - Ignora liniile care contin '?' (sunt intrebari, nu raspunsuri)
   * - Ignora valorile cu lungimea <= 1 (probabil un caracter rezidual)
   *
   * Strategia 2: Cautare cuvinte cheie cunoscute (fallback)
   * - Daca strategia 1 nu a gasit nimic, cauta in textul complet
   *   cuvinte cheie ale sistemelor de incalzire comune:
   *   centrala gaz, centrala lemne, centrala peleti, pompa de caldura,
   *   butelii propan, boiler electric
   * - Returneaza primul sistem gasit
   */
  let currentSystem = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('sistem') && l.includes('incalzire') && l.includes('acum')) {
      /* Extragem valoarea de dupa ultimul ':' din aceeasi linie */
      if (lines[i].includes(':')) {
        const v = lines[i].slice(lines[i].lastIndexOf(':') + 1).trim();
        if (v.length > 1) { currentSystem = san(v); continue; }
      }
      /* Cautam in urmatoarele 2 linii, ignorand liniile cu '?' (intrebari) */
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (lines[j] && lines[j].trim().length > 1 && !lines[j].includes('?')) {
          currentSystem = san(lines[j]); break;
        }
      }
      break;
    }
  }
  /* Fallback: cautam nume de sisteme de incalzire cunoscute in textul complet */
  if (!currentSystem) {
    for (const k of ['centrala gaz', 'centrala lemne', 'centrala peleti', 'pompa de caldura', 'butelii propan', 'boiler electric']) {
      if (text.toLowerCase().includes(k)) { currentSystem = san(k); break; }
    }
  }

  /*
   * ==========================================
   * EXTRAGERE STADIU / VARIANTA ALEASA
   * ==========================================
   * Cauta o linie care contine "varianta aleas" sau "stadiul".
   * Extrage valoarea din urmatoarele 2 linii, ignorand liniile care contin
   * "conectare" sau "panouri" (care sunt raspunsuri la alte intrebari, nu la stadiu).
   * Ignora valorile cu lungimea <= 2 (prea scurte pentru a fi relevante).
   */
  let stage = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('varianta aleas') || l.includes('stadiul')) {
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const v = lines[j]?.trim();
        if (v && v.length > 2 && !v.toLowerCase().includes('conectare') && !v.toLowerCase().includes('panouri')) {
          stage = san(v); break;
        }
      }
      break;
    }
  }

  /*
   * ==========================================
   * EXTRAGERE NOTE SUPLIMENTARE DIN FORMULAR
   * ==========================================
   * Cauta inceputul sectiunii de note, identificat prin:
   * - "intrebari suplimentare" sau
   * - "pe care din sistemele" (intrebarea despre sistemul dorit)
   *
   * Tot textul de la acel punct pana la sfarsitul email-ului este considerat
   * note ale formularului. Liniile goale sunt filtrate, restul sunt concatenate
   * cu '\n'. Daca nu se gaseste niciun marker, formNotes ramane string gol.
   */
  let notesStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('intrebari suplimentare') || lines[i].toLowerCase().includes('pe care din sistemele')) {
      notesStart = i; break;
    }
  }
  const formNotes = notesStart >= 0 ? lines.slice(notesStart).filter(l => l.trim()).join('\n') : '';

  /*
   * ==========================================
   * EXTRAGERE SISTEM DORIT DE CLIENT
   * ==========================================
   * Cauta linia care contine "pe care din sistemele" (intrebarea tipica:
   * "Pe care din sistemele noastre l-ati alege?").
   * Extrage valoarea din urmatoarele 2 linii, eliminand prefixele de lista
   * (bullet points: ·, -, *) si spatiile de la inceput.
   * Ignora valorile cu lungimea <= 3 (prea scurte pentru a fi un raspuns valid).
   */
  let desiredSystem = '';
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('pe care din sistemele')) {
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const v = lines[j]?.replace(/^[\u00B7\-*\s]+/, '').trim();
        if (v && v.length > 3) { desiredSystem = san(v); break; }
      }
      break;
    }
  }

  /*
   * ==========================================
   * EXTRAGERE PLATA LUNARA DORITA
   * ==========================================
   * Cauta o linie care contine simultan "doriti", "platiti" si "luna"
   * (intrebarea tipica: "Cat doriti sa platiti pe luna?").
   * Extrage din urmatoarele 2 linii prima valoare care contine cifre.
   */
  let monthlyPayment = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('doriti') && l.includes('platiti') && l.includes('luna')) {
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (lines[j] && lines[j].trim().match(/\d/)) { monthlyPayment = san(lines[j]); break; }
      }
      break;
    }
  }

  /*
   * Returneaza obiectul ParsedEmail complet cu toate campurile extrase.
   * Campurile care nu au fost gasite raman string gol ('') sau false (hasSolarPanels).
   */
  return { name, email, phone, area, location, hasSolarPanels, consumptionAmount, currentSystem, stage, formNotes, desiredSystem, monthlyPayment };
}
